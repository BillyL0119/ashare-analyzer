"""
Similar trend scanner — /api/similar/{symbol}

Reliability improvements:
  - Per-stock 8s timeout via daemon thread
  - 3x retry with 0.5s backoff per data source
  - Dual source: stock_zh_a_daily (Sina) → stock_zh_a_hist (EMF) fallback
  - 2h fresh cache + 24h stale-while-revalidate fallback
  - Overall 120s deadline; break early rather than hang
  - data_quality: "full" | "partial" | "stale" in every response
  - Return partial results (≥5 stocks) instead of erroring on individual failures
"""

from fastapi import APIRouter, HTTPException
import akshare as ak
import pandas as pd
import json
import os
import time
import logging
import threading
import requests
from datetime import datetime, timedelta

logger = logging.getLogger("similar")
router = APIRouter()

# ── Tuning knobs ──────────────────────────────────────────────────────────────
_CACHE_FRESH   = 7200    # seconds — serve directly from cache
_CACHE_STALE   = 86400   # seconds — serve stale rather than error
_RETRY_N       = 3       # attempts per data source
_RETRY_SLEEP   = 0.5     # seconds between retries
_STOCK_TIMEOUT = 8       # per-stock fetch hard timeout (seconds)
_TOTAL_TIMEOUT = 120     # overall endpoint deadline (seconds)
_MIN_RESULTS   = 5       # minimum acceptable result count before using stale cache
_PEER_SLEEP    = 0.3     # polite delay between peer fetches

# ── Module-level caches ───────────────────────────────────────────────────────
_industry_cache: dict = {}   # symbol -> (industry_name, [codes])
_name_cache: dict = {}       # code -> name
_result_cache: dict = {}     # symbol -> (ts, response_dict)

# ── Industry map ──────────────────────────────────────────────────────────────
_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
try:
    with open(_MAP_PATH, "r", encoding="utf-8") as _f:
        _INDUSTRY_MAP: dict = json.load(_f)
        logger.info("industry_map.json loaded — industries: %s",
                    list(_INDUSTRY_MAP.get("industries", {}).keys()))
except Exception as _e:
    logger.error("Failed to load industry_map.json: %s", _e)
    _INDUSTRY_MAP = {"industries": {}}

# Broad fallback peers when symbol isn't in any industry bucket
_FALLBACK_PEERS = [
    "600519", "000858", "002304",   # 白酒
    "601398", "600036", "000001",   # 银行
    "300750", "601012", "002475",   # 新能源
    "600276", "000538", "002252",   # 医药
    "601166", "600016", "601288",   # 银行2
    "000651", "600690", "002241",   # 消费电子
    "600900", "601991",             # 电力
]

SINA_HEADERS = {
    "Referer": "https://finance.sina.com.cn",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


# ── Low-level helpers ─────────────────────────────────────────────────────────

def _to_sina_symbol(code: str) -> str:
    """'600519' -> 'sh600519', '000858' -> 'sz000858', etc."""
    code = code.strip()
    if code.startswith(("sh", "sz", "bj")):
        return code
    if code.startswith(("60", "68", "51", "11", "50", "58")):
        return "sh" + code
    if code.startswith(("00", "30", "12", "15", "16", "17", "18", "39")):
        return "sz" + code
    if code.startswith(("43", "83", "87", "88")):
        return "bj" + code
    return "sh" + code


def _run_with_timeout(fn, args, timeout):
    """
    Execute fn(*args) in a daemon thread.
    Returns the result, or None if the call exceeds `timeout` seconds.
    Exceptions from fn are re-raised in the calling thread.
    """
    result_box = [None]
    exc_box = [None]

    def _target():
        try:
            result_box[0] = fn(*args)
        except Exception as exc:   # noqa: BLE001
            exc_box[0] = exc

    t = threading.Thread(target=_target, daemon=True)
    t.start()
    t.join(timeout)
    if t.is_alive():
        return None          # timed out — thread keeps running as daemon
    if exc_box[0]:
        raise exc_box[0]
    return result_box[0]


def _normalize_df(df, code: str):
    """
    Extract a clean 'close' pd.Series from an akshare DataFrame.
    Returns None if data is missing or has fewer than 10 rows.
    """
    if df is None or df.empty:
        return None
    df = df.copy()
    df.columns = [str(c).lower().strip() for c in df.columns]
    if "close" not in df.columns:
        for alias in ("收盘", "收盘价", "close_price"):
            if alias in df.columns:
                df = df.rename(columns={alias: "close"})
                break
    if "close" not in df.columns:
        logger.debug("No 'close' column for %s, columns: %s", code, list(df.columns))
        return None
    df = df.sort_index()
    series = df["close"].dropna().rename(code)
    return series if len(series) >= 10 else None


# ── Data source functions (called inside daemon threads) ──────────────────────

def _src_sina(code: str, start: str, end: str, adjust: str):
    return _normalize_df(
        ak.stock_zh_a_daily(
            symbol=_to_sina_symbol(code),
            start_date=start,
            end_date=end,
            adjust=adjust,
        ),
        code,
    )


def _src_hist(code: str, start: str, end: str, adjust: str):
    """Fallback: akshare stock_zh_a_hist (东方财富); dates in YYYY-MM-DD."""
    s_date = f"{start[:4]}-{start[4:6]}-{start[6:]}"
    e_date = f"{end[:4]}-{end[4:6]}-{end[6:]}"
    return _normalize_df(
        ak.stock_zh_a_hist(
            symbol=code,
            period="daily",
            start_date=s_date,
            end_date=e_date,
            adjust=adjust if adjust else "qfq",
        ),
        code,
    )


def _get_closes(code: str, start: str, end: str) -> pd.Series:
    """
    Fetch daily close prices with:
      - 4 source variants: sina-qfq, sina-raw, hist-qfq, hist-raw
      - Up to 3 attempts per source with 0.5s sleep between retries
      - 8s hard timeout per attempt (daemon thread)
    Returns empty Series if all sources/retries fail.
    """
    sources = [
        (_src_sina, (code, start, end, "qfq"), "sina-qfq"),
        (_src_sina, (code, start, end, ""),    "sina-raw"),
        (_src_hist, (code, start, end, "qfq"), "hist-qfq"),
        (_src_hist, (code, start, end, ""),    "hist-raw"),
    ]
    for fn, args, label in sources:
        for attempt in range(1, _RETRY_N + 1):
            try:
                result = _run_with_timeout(fn, args, timeout=_STOCK_TIMEOUT)
                if result is not None and len(result) >= 10:
                    logger.debug("%s fetched via %s (attempt %d, %d rows)",
                                 code, label, attempt, len(result))
                    return result
                if result is None:
                    logger.debug("%s %s attempt %d: timeout", code, label, attempt)
                else:
                    logger.debug("%s %s attempt %d: too few rows (%d)",
                                 code, label, attempt, len(result))
            except Exception as exc:
                logger.debug("%s %s attempt %d error: %s", code, label, attempt, exc)
            if attempt < _RETRY_N:
                time.sleep(_RETRY_SLEEP)

    logger.warning("All sources/retries exhausted for %s", code)
    return pd.Series(dtype=float, name=code)


def _get_stock_name(code: str) -> str:
    """Query Sina HQ API for Chinese stock name; returns code on failure."""
    if code in _name_cache:
        return _name_cache[code]
    try:
        r = requests.get(
            f"http://hq.sinajs.cn/list={_to_sina_symbol(code)}",
            headers=SINA_HEADERS,
            timeout=5,
        )
        text = r.text
        if '"' in text:
            name = text.split('"')[1].split(",")[0].strip()
            if name and not name.startswith(("sh", "sz", "bj")):
                _name_cache[code] = name
                return name
    except Exception as exc:
        logger.debug("name lookup failed for %s: %s", code, exc)
    return code


def _find_industry(symbol: str):
    """Return (industry_name, [peer_codes]) for symbol."""
    if symbol in _industry_cache:
        return _industry_cache[symbol]
    industries = _INDUSTRY_MAP.get("industries", {})
    for name, codes in industries.items():
        if symbol in codes:
            result = (name, [c for c in codes if c != symbol])
            _industry_cache[symbol] = result
            return result
    # Not in map — use broad fallback
    fallback = [c for c in _FALLBACK_PEERS if c != symbol]
    result = ("综合", fallback)
    _industry_cache[symbol] = result
    logger.info("Symbol %s not in industry map; using %d fallback peers",
                symbol, len(fallback))
    return result


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{symbol}")
def similar_stocks(symbol: str):
    """
    Returns up to 10 peer stocks ranked by price-trend correlation with `symbol`.

    Response fields:
      symbol, industry, results, data_quality
    data_quality: "full" | "partial" | "stale"
    """
    stale_cached = None   # defined here so the except block can reach it

    try:
        now = time.time()
        deadline = now + _TOTAL_TIMEOUT

        # ── Cache ──────────────────────────────────────────────────────────────
        if symbol in _result_cache:
            ts, cached = _result_cache[symbol]
            age = now - ts
            if age < _CACHE_FRESH:
                logger.debug("Cache hit for %s (age=%.0fs)", symbol, age)
                return cached
            if age < _CACHE_STALE:
                stale_cached = cached   # available as emergency fallback

        end_dt  = datetime.now()
        end_str = end_dt.strftime("%Y%m%d")

        # ── Target stock price series ──────────────────────────────────────────
        start_str = (end_dt - timedelta(days=100)).strftime("%Y%m%d")
        logger.info("Fetching closes for target %s (%s→%s)", symbol, start_str, end_str)
        target_closes = _get_closes(symbol, start_str, end_str)

        # Widen to 240 days if data is sparse
        if len(target_closes) < 10:
            wider_str = (end_dt - timedelta(days=240)).strftime("%Y%m%d")
            logger.info("Widening window for %s → %s", symbol, wider_str)
            target_closes = _get_closes(symbol, wider_str, end_str)
            start_str = wider_str   # peers also use wider window

        if len(target_closes) < 10:
            if stale_cached:
                logger.warning("Target data unavailable for %s — serving stale cache", symbol)
                return {**stale_cached, "data_quality": "stale"}
            raise HTTPException(
                status_code=422,
                detail=(
                    f"无法获取 {symbol} 的历史行情数据（不足 10 个交易日），"
                    "请确认股票代码正确且未停牌"
                ),
            )

        target_returns = target_closes.pct_change().dropna()

        # ── Industry peers ─────────────────────────────────────────────────────
        industry_name, peer_codes = _find_industry(symbol)
        peer_codes = peer_codes[:20]

        # ── Fetch peers sequentially (respect overall deadline) ────────────────
        peer_data = []
        deadline_hit = False
        for code in peer_codes:
            if time.time() > deadline:
                remaining = len(peer_codes) - len(peer_data)
                logger.warning("Deadline hit at peer %s for %s (%d peers skipped)",
                               code, symbol, remaining)
                deadline_hit = True
                break
            closes = _get_closes(code, start_str, end_str)
            name   = _get_stock_name(code)
            peer_data.append((code, name, closes))
            time.sleep(_PEER_SLEEP)

        # ── Pearson correlation on aligned daily returns ────────────────────────
        results = []
        failed  = len(peer_codes) - len(peer_data)   # peers skipped by deadline

        for code, name, closes in peer_data:
            if len(closes) < 10:
                failed += 1
                continue
            peer_returns = closes.pct_change().dropna()
            common_idx   = target_returns.index.intersection(peer_returns.index)
            if len(common_idx) < 10:
                failed += 1
                continue
            corr = float(target_returns[common_idx].corr(peer_returns[common_idx]))
            if corr != corr:      # NaN guard
                failed += 1
                continue
            base = float(closes.iloc[0])
            if base == 0:
                failed += 1
                continue
            sparkline = [round(float(v) / base * 100, 2) for v in closes.tolist()]
            results.append({
                "code":        code,
                "name":        name,
                "correlation": round(corr, 4),
                "sparkline":   sparkline,
            })

        results.sort(key=lambda x: x["correlation"], reverse=True)
        data_quality = "full" if (failed == 0 and not deadline_hit) else "partial"

        # Too few results → prefer stale cache over a low-confidence answer
        if len(results) < _MIN_RESULTS and stale_cached:
            logger.warning(
                "Only %d results for %s (failed=%d) — serving stale cache",
                len(results), symbol, failed,
            )
            return {**stale_cached, "data_quality": "stale"}

        response = {
            "symbol":       symbol,
            "industry":     industry_name,
            "results":      results[:10],
            "data_quality": data_quality,
        }
        _result_cache[symbol] = (now, response)
        logger.info("Done %s: %d results, %d failed, quality=%s",
                    symbol, len(results), failed, data_quality)
        return response

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error for %s", symbol)
        if stale_cached:
            logger.warning("Exception fallback to stale cache for %s", symbol)
            return {**stale_cached, "data_quality": "stale"}
        raise HTTPException(status_code=500, detail=f"服务器内部错误：{exc}") from exc

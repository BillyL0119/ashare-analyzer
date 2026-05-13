"""
Similar trend scanner — backend router.
Finds A-share stocks in the same industry whose recent price movements
are most correlated with the target stock.

Data source: Sina Finance via akshare (works from HK servers).
"""

from fastapi import APIRouter, HTTPException
import akshare as ak
import pandas as pd
import json
import os
import time
import logging
import requests
from datetime import datetime, timedelta

logger = logging.getLogger("similar")
router = APIRouter()

# ── Caches ────────────────────────────────────────────────────────────────────
_industry_cache: dict = {}   # symbol -> (industry_name, [codes])
_name_cache: dict = {}       # code -> name
_result_cache: dict = {}     # symbol -> (timestamp, response_dict)
_CACHE_TTL = 3600            # 1 hour

# ── Industry map ─────────────────────────────────────────────────────────────
_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
try:
    with open(_MAP_PATH, "r", encoding="utf-8") as _f:
        _INDUSTRY_MAP: dict = json.load(_f)
        logger.info("industry_map.json loaded OK, industries: %s",
                    list(_INDUSTRY_MAP.get("industries", {}).keys()))
except Exception as _e:
    logger.error("Failed to load industry_map.json: %s", _e)
    _INDUSTRY_MAP = {"industries": {}}

# Broad fallback peer list used when a stock isn't in any industry bucket.
# Mix of large-caps across sectors so there's always something to correlate.
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


# ── Helpers ───────────────────────────────────────────────────────────────────

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
    return "sh" + code  # default Shanghai


def _get_stock_name(code: str) -> str:
    """Query Sina HQ API for the stock's Chinese name."""
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
            name = text.split('"')[1].split(",")[0]
            if name and not name.startswith("sh") and not name.startswith("sz"):
                _name_cache[code] = name
                return name
    except Exception as exc:
        logger.debug("name lookup failed for %s: %s", code, exc)
    return code


def _get_closes(code: str, start: str, end: str) -> pd.Series:
    """
    Fetch daily close prices from Sina Finance.
    Tries forward-adjusted first; falls back to unadjusted on failure.
    Returns an empty Series on any error.
    """
    sina_sym = _to_sina_symbol(code)
    for adjust in ("qfq", ""):
        try:
            df = ak.stock_zh_a_daily(
                symbol=sina_sym,
                start_date=start,
                end_date=end,
                adjust=adjust,
            )
            if df is None or df.empty:
                continue

            # Normalize column names (some akshare versions use different names)
            df.columns = [c.lower().strip() for c in df.columns]
            if "close" not in df.columns:
                # Try common aliases
                for alias in ("收盘", "收盘价", "close_price"):
                    if alias in df.columns:
                        df = df.rename(columns={alias: "close"})
                        break

            if "close" not in df.columns:
                logger.warning("No 'close' column for %s (adjust=%s), cols: %s",
                               code, adjust, list(df.columns))
                continue

            df = df.sort_index()
            series = df["close"].dropna()
            if len(series) >= 10:
                logger.debug("Got %d rows for %s (adjust=%s)", len(series), code, adjust)
                return series.rename(code)
        except Exception as exc:
            logger.warning("stock_zh_a_daily failed for %s adjust=%s: %s", code, adjust, exc)

    return pd.Series(dtype=float, name=code)


def _find_industry(symbol: str):
    """Return (industry_name, peer_code_list) for symbol."""
    if symbol in _industry_cache:
        return _industry_cache[symbol]

    industries = _INDUSTRY_MAP.get("industries", {})
    for name, codes in industries.items():
        if symbol in codes:
            result = (name, [c for c in codes if c != symbol])
            _industry_cache[symbol] = result
            return result

    # Not in map — use fallback peers
    fallback = [c for c in _FALLBACK_PEERS if c != symbol]
    result = ("综合", fallback)
    _industry_cache[symbol] = result
    logger.info("Symbol %s not in industry map; using fallback peers", symbol)
    return result


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{symbol}")
def similar_stocks(symbol: str):
    """
    Returns up to 10 stocks from the same industry whose recent price
    trend is most correlated with `symbol` (Pearson on daily returns).
    Results are cached for 1 hour.
    """
    try:
        # ── Cache hit ──
        now = time.time()
        if symbol in _result_cache:
            ts, cached = _result_cache[symbol]
            if now - ts < _CACHE_TTL:
                logger.debug("Cache hit for %s", symbol)
                return cached

        end_dt = datetime.now()
        start_dt = end_dt - timedelta(days=100)   # ~70 trading days
        start_str = start_dt.strftime("%Y%m%d")
        end_str = end_dt.strftime("%Y%m%d")

        # ── Target series ──
        logger.info("Fetching closes for target %s (start=%s end=%s)", symbol, start_str, end_str)
        target_closes = _get_closes(symbol, start_str, end_str)
        # If sparse data in 100-day window, widen to 240 days
        if len(target_closes) < 10:
            wider_start = (end_dt - timedelta(days=240)).strftime("%Y%m%d")
            logger.info("Retrying %s with wider window %s", symbol, wider_start)
            target_closes = _get_closes(symbol, wider_start, end_str)
        if len(target_closes) < 10:
            raise HTTPException(
                status_code=422,
                detail=f"无法获取 {symbol} 的历史行情数据（不足 10 个交易日），请确认股票代码正确且未停牌",
            )

        target_returns = target_closes.pct_change().dropna()

        # ── Industry peers ──
        industry_name, peer_codes = _find_industry(symbol)
        peer_codes = peer_codes[:20]   # cap at 20 to limit request time

        # ── Fetch each peer sequentially ──
        peer_data = []
        for code in peer_codes:
            closes = _get_closes(code, start_str, end_str)
            name = _get_stock_name(code)
            peer_data.append((code, name, closes))
            time.sleep(0.3)

        # ── Pearson correlation on aligned daily returns ──
        results = []
        for code, name, closes in peer_data:
            if len(closes) < 10:
                continue
            peer_returns = closes.pct_change().dropna()
            common_idx = target_returns.index.intersection(peer_returns.index)
            if len(common_idx) < 10:
                continue
            corr = float(target_returns[common_idx].corr(peer_returns[common_idx]))
            if corr != corr:   # NaN check
                continue
            base = float(closes.iloc[0])
            if base == 0:
                continue
            sparkline = [round(float(v) / base * 100, 2) for v in closes.tolist()]
            results.append({
                "code": code,
                "name": name,
                "correlation": round(corr, 4),
                "sparkline": sparkline,
            })

        results.sort(key=lambda x: x["correlation"], reverse=True)

        response = {
            "symbol": symbol,
            "industry": industry_name,
            "results": results[:10],
        }
        _result_cache[symbol] = (now, response)
        logger.info("Similar scan done for %s: %d results", symbol, len(results))
        return response

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error in similar_stocks for %s", symbol)
        raise HTTPException(status_code=500, detail=f"服务器内部错误：{exc}") from exc

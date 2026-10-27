"""
Similar trend scanner — /api/similar/{symbol}

Reliability improvements:
  - Per-stock 8s timeout via daemon thread
  - 3x retry with 0.5s backoff per data source
  - Sources: Tencent kline → stock_zh_a_daily (Sina) → stock_zh_a_hist (EMF) fallback
  - 2h fresh cache + 24h stale-while-revalidate fallback
  - Overall 120s deadline; break early rather than hang
  - data_quality: "full" | "partial" | "stale" in every response
  - Return partial results (≥5 stocks) instead of erroring on individual failures
"""

from fastapi import APIRouter, HTTPException
import akshare as ak
import pandas as pd
import re
import requests
import json
import os
import time
import logging
import threading
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from services.js_runtime import v8_call

logger = logging.getLogger("similar")
router = APIRouter()

# ── Tuning knobs ──────────────────────────────────────────────────────────────
_CACHE_FRESH   = 7200    # seconds — serve directly from cache
_CACHE_STALE   = 86400   # seconds — serve stale rather than error
_RETRY_N       = 3       # attempts per data source
_RETRY_SLEEP   = 0.5     # seconds between retries
_STOCK_TIMEOUT = 8       # per-stock fetch hard timeout (seconds)
_TOTAL_TIMEOUT = 45      # overall endpoint deadline (seconds): the proxy answers 504 at 60s, so a slow
                         # scan returns the peers it has rather than nothing
_MIN_RESULTS   = 5       # minimum acceptable result count before using stale cache
_PEER_WORKERS  = 6       # peers fetched in parallel (Tencent first; the Sina fallback serializes on V8_LOCK)

# ── Module-level caches ───────────────────────────────────────────────────────
_industry_cache: dict = {}   # symbol -> (industry_name, [codes])
_result_cache: dict = {}     # symbol -> (ts, response_dict)
_cross_cache: dict  = {}     # symbol -> (ts, response_dict)  for /cross
_name_map: dict = {}         # code -> name, populated at startup

# ── Disk cache directories ────────────────────────────────────────────────────
_SIMILAR_CACHE_DIR = os.path.join(os.path.dirname(__file__), "../data/similar_cache")
_PRICE_CACHE_DIR   = os.path.join(os.path.dirname(__file__), "../data/price_cache")
os.makedirs(_SIMILAR_CACHE_DIR, exist_ok=True)
os.makedirs(_PRICE_CACHE_DIR,   exist_ok=True)

def _require_a_share(symbol: str) -> None:
    """These scans walk A-share industry peers; anything else (US tickers use /api/us/similar) would
    only burn ~20s of history fetches before failing."""
    if not re.fullmatch(r"\d{6}", symbol or ""):
        raise HTTPException(400, "A-share code required (6 digits); use /api/us/similar for US stocks")


# ── Related-industry mapping for cross-sector scan ────────────────────────────
_RELATED_INDUSTRY: dict[str, list[str]] = {
    "白酒":  ["消费"],
    "银行":  ["金融"],      # 金融若不在 map 中则忽略，不报错
    "新能源": ["科技"],
    "医药":  ["消费"],
    "科技":  ["新能源"],
    "消费":  ["白酒"],
    "军工":  ["科技"],
    "地产":  ["能源"],
    "能源":  ["化工", "电力"],
    "化工":  ["能源"],
    "汽车":  ["新能源"],
    "电力":  ["能源", "新能源"],
    "传媒":  ["科技", "消费"],
}

# ── Preload stock names in background ─────────────────────────────────────────
def _load_name_map():
    """
    Populate _name_map with A-share code→name pairs.
    Source 0: data/stock_names.json
    Source 2: Tencent batch quotes for every code in industry_map.json
    (Eastmoney's spot list is skipped: it redirects our server to a bot check.)
    """
    import requests as _requests

    # ── Source 0: local stock_names.json (always available) ───────────────────
    try:
        _local_path = os.path.join(os.path.dirname(__file__), "../data/stock_names.json")
        with open(_local_path, "r", encoding="utf-8") as _lf:
            _name_map.update(json.load(_lf))
        logger.info("Name map seeded from local stock_names.json: %d entries", len(_name_map))
    except Exception as _le:
        logger.warning("local stock_names.json load failed: %s", _le)

    # ── Source 2: Tencent batch quotes ─────────────────────────────────────────
    try:
        all_codes: list[str] = []
        for codes in _INDUSTRY_MAP.get("industries", {}).values():
            all_codes.extend(codes)
        all_codes.extend(_FALLBACK_PEERS)
        all_codes = list(dict.fromkeys(all_codes))   # deduplicate, preserve order

        # Tencent quotes (Sina hq.sinajs.cn 403s from the server)
        from services.stock_service import tencent_quotes
        for code, q in tencent_quotes(all_codes, timeout=10).items():
            if q["name"]:
                _name_map[code] = q["name"]
        logger.info("Name map loaded via Tencent batch: %d stocks", len(_name_map))
    except Exception as exc:
        logger.error("Tencent batch name lookup failed: %s", exc)


def _get_stock_name(code: str) -> str:
    """Look up stock name from preloaded map; return code as fallback."""
    return _name_map.get(code, code)

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

# Started only now: the loader reads _INDUSTRY_MAP and _FALLBACK_PEERS defined just above
threading.Thread(target=_load_name_map, daemon=True).start()


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
        v8_call(
            ak.stock_zh_a_daily,
            symbol=_to_sina_symbol(code),
            start_date=start,
            end_date=end,
            adjust=adjust,
        ),
        code,
    )


def _src_tencent(code: str, start: str, end: str, adjust: str):
    """Tencent's kline API: the requested window in one small request, no V8 decoding.
    (Sina sends the whole ~6000-day history per stock and is decoded in mini_racer.)"""
    sym = _to_sina_symbol(code)
    s_date = f"{start[:4]}-{start[4:6]}-{start[6:]}"
    e_date = f"{end[:4]}-{end[4:6]}-{end[6:]}"
    r = requests.get("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get",
                     params={"param": f"{sym},day,{s_date},{e_date},800,{adjust}"}, timeout=6)
    node = (r.json().get("data") or {}).get(sym) or {}
    rows = node.get(f"{adjust}day" if adjust else "day") or node.get("day") or []
    if len(rows) < 10:
        return None
    return pd.Series([float(x[2]) for x in rows], index=pd.to_datetime([x[0] for x in rows]),
                     name=code, dtype=float)


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


_tencent_down_until = 0.0


def _get_closes(code: str, start: str, end: str) -> pd.Series:
    """
    Fetch daily close prices with:
      - 4 source variants: sina-qfq, sina-raw, hist-qfq, hist-raw
      - Up to 3 attempts per source with 0.5s sleep between retries
      - 8s hard timeout per attempt (daemon thread)
    Returns empty Series if all sources/retries fail.
    """
    sources = [
        (_src_tencent, (code, start, end, "qfq"), "tencent-qfq"),
        (_src_sina, (code, start, end, "qfq"), "sina-qfq"),
        (_src_sina, (code, start, end, ""),    "sina-raw"),
        (_src_hist, (code, start, end, "qfq"), "hist-qfq"),
        (_src_hist, (code, start, end, ""),    "hist-raw"),
    ]
    global _tencent_down_until
    for fn, args, label in sources:
        if fn is _src_tencent and time.time() < _tencent_down_until:
            continue
        for attempt in range(1, _RETRY_N + 1):
            try:
                result = _run_with_timeout(fn, args, timeout=_STOCK_TIMEOUT)
                if result is None and fn is _src_tencent:
                    raise TimeoutError("Tencent K-line timed out")
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
                if fn is _src_tencent:
                    # A failing feed fails every stock: skip it for 10 minutes instead of 3 tries each
                    _tencent_down_until = time.time() + 600
                    logger.warning("Tencent K-line failing (%s); using Sina for 10 minutes", exc)
                    break
            if attempt < _RETRY_N:
                time.sleep(_RETRY_SLEEP)

    logger.warning("All sources/retries exhausted for %s", code)
    return pd.Series(dtype=float, name=code)



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


def _build_cross_pool(symbol: str):
    """
    Return (primary_industry, [related_industry_names], [(code, industry, type)])
    where type is 'same' | 'related'.
    Deduplicates: each code appears at most once, preferring 'same'.
    """
    industries = _INDUSTRY_MAP.get("industries", {})

    # Find primary industry
    primary: str | None = None
    for iname, codes in industries.items():
        if symbol in codes:
            primary = iname
            break

    if primary is None:
        # Not in map — broad fallback, all tagged "same"
        pool = [(c, "综合", "same") for c in _FALLBACK_PEERS if c != symbol]
        return ("综合", [], pool)

    # Related industries (only those actually present in the map)
    related_names = [r for r in _RELATED_INDUSTRY.get(primary, []) if r in industries]

    seen: set[str] = {symbol}
    pool: list[tuple[str, str, str]] = []

    # Same-industry peers first
    for code in industries.get(primary, []):
        if code not in seen:
            pool.append((code, primary, "same"))
            seen.add(code)

    # Related-industry peers next
    for rel in related_names:
        for code in industries.get(rel, []):
            if code not in seen:
                pool.append((code, rel, "related"))
                seen.add(code)

    return (primary, related_names, pool)



def _get_closes_cached(code: str, start: str, end: str) -> pd.Series:
    """Disk-cached wrapper around _get_closes. Cache key: code + today's date."""
    today   = datetime.now().strftime("%Y%m%d")
    pc_file = os.path.join(_PRICE_CACHE_DIR, f"{code}_{today}.json")
    if os.path.exists(pc_file):
        try:
            with open(pc_file, "r") as _f:
                _pc = json.load(_f)
            s = pd.Series(
                _pc["prices"],
                index=pd.to_datetime(_pc["dates"]),
                name=code, dtype=float,
            )
            if len(s) >= 10:
                logger.debug("Price disk cache hit for %s", code)
                return s
        except Exception as _e:
            logger.debug("Price cache read %s: %s", code, _e)

    result = _get_closes(code, start, end)

    if len(result) >= 10:
        try:
            with open(pc_file, "w") as _f:
                json.dump({
                    "dates":  [str(d)[:10] for d in result.index],
                    "prices": [float(v) for v in result.values],
                }, _f)
        except Exception as _e:
            logger.debug("Price cache write %s: %s", code, _e)
    return result

def _keep(cache: dict, symbol: str, now: float, response: dict, disk_name: str):
    """Remember a scan: a full one for the day (memory and disk); a partial one for 5 minutes only, as the
    peers that missed the deadline are still loading into the price cache; an empty one not at all."""
    if not response["results"]:
        return
    if response["data_quality"] != "full":
        cache[symbol] = (now - _CACHE_FRESH + 300, response)
        return
    cache[symbol] = (now, response)
    try:
        with open(os.path.join(_SIMILAR_CACHE_DIR, disk_name), "w", encoding="utf-8") as f:
            json.dump(response, f, ensure_ascii=False)
    except Exception as e:
        logger.debug("Similar disk cache write %s: %s", symbol, e)


def _fetch_closes_parallel(codes: list, start: str, end: str, deadline: float) -> tuple[dict, bool]:
    """{code: closes} for every peer that finished before `deadline`, and whether it was hit.
    Was one peer at a time with a 0.3s pause: 20 peers took 20-50s."""
    ex = ThreadPoolExecutor(max_workers=_PEER_WORKERS)
    futures = {code: ex.submit(_get_closes_cached, code, start, end) for code in codes}
    out, hit = {}, False
    for code, fut in futures.items():
        try:
            out[code] = fut.result(timeout=max(0.1, deadline - time.time()))
        except FuturesTimeout:
            hit = True
        except Exception as e:
            logger.debug("peer %s failed: %s", code, e)
            out[code] = pd.Series(dtype=float, name=code)
    ex.shutdown(wait=False, cancel_futures=True)
    return out, hit


# ── Routes ────────────────────────────────────────────────────────────────────
# NOTE: /{symbol}/cross must be registered BEFORE /{symbol} so FastAPI
# doesn't accidentally shadow it (extra path segment makes them distinct,
# but explicit ordering is safer).

@router.get("/{symbol}/cross")
def similar_cross(symbol: str):
    """
    Cross-industry similar trend scan.
    Combines same-industry peers with related-industry peers, returns top 15
    ranked by Pearson correlation.  Each result carries 'industry' and
    'industry_type' ("same" | "related") fields.
    """
    _require_a_share(symbol)
    stale_cached = None

    try:
        now = time.time()
        deadline = now + _TOTAL_TIMEOUT

        # ── Cache ──────────────────────────────────────────────────────────────
        today_c = datetime.now().strftime("%Y%m%d")
        _cc_file = os.path.join(_SIMILAR_CACHE_DIR, f"{symbol}_cross_{today_c}.json")
        if os.path.exists(_cc_file) and symbol not in _cross_cache:
            try:
                with open(_cc_file, "r", encoding="utf-8") as _ccf:
                    _cdisk = json.load(_ccf)
                if _cdisk.get("results"):          # an empty scan is not worth keeping
                    _cross_cache[symbol] = (now, _cdisk)
                logger.info("Cross disk cache loaded for %s", symbol)
            except Exception as _cce:
                logger.debug("Cross disk cache read %s: %s", symbol, _cce)

        if symbol in _cross_cache:
            ts, cached = _cross_cache[symbol]
            age = now - ts
            if age < _CACHE_FRESH:
                return cached
            if age < _CACHE_STALE:
                stale_cached = cached

        end_dt  = datetime.now()
        end_str = end_dt.strftime("%Y%m%d")
        start_str = (end_dt - timedelta(days=100)).strftime("%Y%m%d")

        # ── Target price series ────────────────────────────────────────────────
        logger.info("Cross scan: fetching target %s", symbol)
        target_closes = _get_closes_cached(symbol, start_str, end_str)
        if len(target_closes) < 10:
            wider_str = (end_dt - timedelta(days=240)).strftime("%Y%m%d")
            target_closes = _get_closes_cached(symbol, wider_str, end_str)
            start_str = wider_str

        if len(target_closes) < 10:
            if stale_cached:
                return {**stale_cached, "data_quality": "stale"}
            raise HTTPException(
                status_code=422,
                detail=f"无法获取 {symbol} 的历史行情数据（不足 10 个交易日）",
            )

        target_returns = target_closes.pct_change().dropna()

        # ── Build cross-industry candidate pool ────────────────────────────────
        primary, related_names, pool = _build_cross_pool(symbol)
        # Limit to 25 candidates to stay within deadline
        pool = pool[:25]

        target_name = _get_stock_name(symbol)
        total_pool_size = len(pool)

        # ── Fetch peers in parallel (respect overall deadline) ─────────────────
        closes_by_code, deadline_hit = _fetch_closes_parallel([c for c, _, _ in pool], start_str, end_str, deadline)
        if deadline_hit:
            logger.warning("Cross deadline hit for %s (%d of %d peers fetched)", symbol, len(closes_by_code), len(pool))
        peer_data: list[tuple[str, str, str, str, pd.Series]] = [
            (code, _get_stock_name(code), industry, itype, closes_by_code[code])
            for code, industry, itype in pool if code in closes_by_code
        ]

        # ── Compute correlations ───────────────────────────────────────────────
        results = []
        failed = total_pool_size - len(peer_data)

        for code, name, industry, itype, closes in peer_data:
            if len(closes) < 10:
                failed += 1
                continue
            peer_returns = closes.pct_change().dropna()
            common_idx   = target_returns.index.intersection(peer_returns.index)
            if len(common_idx) < 10:
                failed += 1
                continue
            corr = float(target_returns[common_idx].corr(peer_returns[common_idx]))
            if corr != corr:
                failed += 1
                continue
            base = float(closes.iloc[0])
            if base == 0:
                failed += 1
                continue
            sparkline = [round(float(v) / base * 100, 2) for v in closes.tolist()]
            results.append({
                "code":          code,
                "name":          name,
                "industry":      industry,
                "industry_type": itype,
                "correlation":   round(corr, 4),
                "sparkline":     sparkline,
            })

        results.sort(key=lambda x: x["correlation"], reverse=True)
        data_quality = "full" if (failed == 0 and not deadline_hit) else "partial"

        if len(results) < _MIN_RESULTS and stale_cached:
            return {**stale_cached, "data_quality": "stale"}

        # Scanned industries summary
        scanned = [primary] + related_names

        response = {
            "symbol":             symbol,
            "name":               target_name,
            "primary_industry":   primary,
            "related_industries": related_names,
            "scanned_industries": scanned,
            "results":            results[:15],
            "data_quality":       data_quality,
        }
        _keep(_cross_cache, symbol, now, response, f"{symbol}_cross_{datetime.now().strftime('%Y%m%d')}.json")
        logger.info("Cross done %s: primary=%s related=%s results=%d failed=%d",
                    symbol, primary, related_names, len(results), failed)
        return response

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Cross scan error for %s", symbol)
        if stale_cached:
            return {**stale_cached, "data_quality": "stale"}
        from security import internal_error
        raise internal_error() from exc
@router.get("/{symbol}")
def similar_stocks(symbol: str):
    """
    Returns up to 10 peer stocks ranked by price-trend correlation with `symbol`.

    Response fields:
      symbol, industry, results, data_quality
    data_quality: "full" | "partial" | "stale"
    """
    _require_a_share(symbol)
    stale_cached = None   # defined here so the except block can reach it

    try:
        now = time.time()
        deadline = now + _TOTAL_TIMEOUT

        # ── Cache ──────────────────────────────────────────────────────────────
        today = datetime.now().strftime("%Y%m%d")
        _sc_file = os.path.join(_SIMILAR_CACHE_DIR, f"{symbol}_{today}.json")
        if os.path.exists(_sc_file) and symbol not in _result_cache:
            try:
                with open(_sc_file, "r", encoding="utf-8") as _scf:
                    _disk = json.load(_scf)
                if _disk.get("results"):
                    _result_cache[symbol] = (now, _disk)
                logger.info("Similar disk cache loaded for %s", symbol)
            except Exception as _sce:
                logger.debug("Similar disk cache read %s: %s", symbol, _sce)

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
        target_closes = _get_closes_cached(symbol, start_str, end_str)

        # Widen to 240 days if data is sparse
        if len(target_closes) < 10:
            wider_str = (end_dt - timedelta(days=240)).strftime("%Y%m%d")
            logger.info("Widening window for %s → %s", symbol, wider_str)
            target_closes = _get_closes_cached(symbol, wider_str, end_str)
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

        # ── Fetch peers in parallel (respect overall deadline) ─────────────────
        closes_by_code, deadline_hit = _fetch_closes_parallel(peer_codes, start_str, end_str, deadline)
        if deadline_hit:
            logger.warning("Deadline hit for %s (%d of %d peers fetched)", symbol, len(closes_by_code), len(peer_codes))
        peer_data = [(code, _get_stock_name(code), closes_by_code[code]) for code in peer_codes if code in closes_by_code]

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
        _keep(_result_cache, symbol, now, response, f"{symbol}_{datetime.now().strftime('%Y%m%d')}.json")
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
        from security import internal_error
        raise internal_error() from exc
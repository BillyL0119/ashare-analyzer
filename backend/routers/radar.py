"""
Radar score API — /api/radar/{symbol}

Returns 6 dimension scores (0-100) for radar chart comparison:
  valuation : PE ratio, lower = better (score closer to 100)
  pb        : PB ratio, lower = better
  momentum  : 1-year price return
  stability : inverse of annualised volatility
  volume    : recent 30d volume vs full-year average
  similarity: price correlation with CSI 300 (市场相关性)

All scores are normalised to [0, 100].
Data sources: A-shares: akshare (price), yfinance (PE/PB), CSI 300.
              US stocks: Tencent kline (price), NASDAQ public API (PE/PB), SPY for market correlation.
"""

from fastapi import APIRouter, HTTPException
import numpy as np
import math
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from services.stock_service import sina_a_daily, sina_index_daily

router = APIRouter()
logger = logging.getLogger("radar")

_cache: dict = {}       # symbol -> (timestamp, result)
_CACHE_TTL = 3600       # 1 hour


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe(val):
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return None


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


def _to_sina(symbol: str) -> str:
    """Convert bare 6-digit code to Sina symbol."""
    from services.stock_service import _get_sina_symbol
    return _get_sina_symbol(symbol)


def _to_yf(symbol: str) -> str:
    from services.stock_service import yahoo_cn_symbol
    return yahoo_cn_symbol(symbol)


def _get_name(symbol: str) -> str:
    """Chinese stock name from Tencent quotes (Eastmoney is unreachable from the server)."""
    try:
        from services.stock_service import tencent_quotes
        return (tencent_quotes([symbol]).get(symbol) or {}).get("name") or symbol
    except Exception:
        return symbol


# ── Score computation ─────────────────────────────────────────────────────────

def _is_us(symbol: str) -> bool:
    return not symbol.isdigit()


def _score_from_series(pe, pb, closes, volumes, mkt_closes, us: bool = False) -> dict:
    """Shared scoring. US ranges are wider: growth stocks routinely trade at PE 30-60 and PB 10+."""
    scores: dict[str, int] = {}
    if us:
        # PE 10 -> 100, PE 70 -> 0 (linear); PB on a log scale: 1 -> 100, 10 -> 50, 100 -> 0
        # (buybacks push some mega caps' PB past 40, e.g. AAPL ~56, which shouldn't read as a flat 0)
        scores["valuation"] = round(_clamp((70 - pe) / 60 * 100)) if pe and pe > 0 else 50
        scores["pb"] = round(_clamp((1 - math.log(max(pb, 1.0)) / math.log(100)) * 100)) if pb and pb > 0 else 50
    else:
        scores["valuation"] = round(_clamp((80 - pe) / 75 * 100)) if pe and pe > 0 else 50
        scores["pb"] = round(_clamp((15 - pb) / 14.5 * 100)) if pb and pb > 0 else 50
    if len(closes) < 20:
        scores.update({"momentum": 50, "stability": 50, "volume": 50, "similarity": 50})
        return scores
    arr = np.array(closes, dtype=float)
    rets = np.diff(arr) / arr[:-1]
    total_ret = (closes[-1] - closes[0]) / closes[0] * 100
    ann_vol = float(np.std(rets) * np.sqrt(252) * 100)
    if us:
        scores["momentum"] = round(_clamp((total_ret + 40) / 160 * 100))      # -40% .. +120%
        scores["stability"] = round(_clamp((70 - ann_vol) / 55 * 100))        # vol 15% -> 100, 70% -> 0
    else:
        scores["momentum"] = round(_clamp((total_ret + 50) / 150 * 100))
        scores["stability"] = round(_clamp((80 - ann_vol) / 80 * 100))
    if len(volumes) >= 30:
        recent_avg = float(np.mean(volumes[-30:]))
        full_avg = float(np.mean(volumes)) or recent_avg
        ratio = recent_avg / full_avg if full_avg > 0 else 1.0
        scores["volume"] = round(_clamp((ratio - 0.3) / 1.7 * 100))
    else:
        scores["volume"] = 50
    scores["similarity"] = 50
    if len(mkt_closes) >= 21:
        n = min(len(rets), len(mkt_closes) - 1)
        mkt_arr = np.array(mkt_closes[-(n + 1):], dtype=float)
        mkt_rets = np.diff(mkt_arr) / mkt_arr[:-1]
        if n >= 10:
            corr = float(np.corrcoef(rets[-n:], mkt_rets)[0, 1])
            if not math.isnan(corr):
                scores["similarity"] = round(_clamp((corr + 1) / 2 * 100))
    return scores


def _compute_us(symbol: str) -> tuple:
    """(scores, name) for a US ticker."""
    from routers.us_stocks import _fetch_history_candles
    from routers.score import _nasdaq_fundamentals_us
    candles = _fetch_history_candles(symbol, 365)[-252:]
    closes = [c["close"] for c in candles if c.get("close")]
    volumes = [c["volume"] for c in candles if c.get("volume") is not None]
    mkt = [c["close"] for c in _fetch_history_candles("SPY", 365)[-252:] if c.get("close")]
    try:
        fund = _nasdaq_fundamentals_us(symbol)
    except Exception as e:
        logger.warning("US fundamentals failed for %s: %s", symbol, e)
        fund = {}
    name = symbol
    try:
        from routers.us_market import us_quotes
        name = (us_quotes([symbol]).get(symbol) or {}).get("name") or symbol
    except Exception:
        pass
    return _score_from_series(_safe(fund.get("pe")), _safe(fund.get("pb")), closes, volumes, mkt, us=True), name


def _pe_pb(symbol: str) -> tuple:
    """PE / PB from Tencent quotes (yfinance is rate limited from the server)."""
    try:
        from services.stock_service import tencent_quotes
        q = tencent_quotes([symbol]).get(symbol) or {}
        return _safe(q.get("pe")), _safe(q.get("pb"))
    except Exception as e:
        logger.warning("Tencent PE/PB failed for %s: %s", symbol, e)
        return None, None


def _csi300_closes() -> list:
    """CSI 300 closes for market correlation."""
    try:
        mkt_df = sina_index_daily("sh000300")
        mkt_df = mkt_df.sort_index().tail(252)
        return mkt_df["close"].dropna().tolist()
    except Exception as e:
        logger.debug("CSI 300 data failed: %s", e)
        return []


def _compute(symbol: str) -> dict:
    # The quote and CSI 300 download alongside the price history
    with ThreadPoolExecutor(max_workers=2) as pool:
        quote_job, mkt_job = pool.submit(_pe_pb, symbol), pool.submit(_csi300_closes)

        # ── Price data (1 year daily) ────────────────────────────────────────
        closes: list[float] = []
        volumes: list[float] = []
        try:
            df = sina_a_daily(_to_sina(symbol), adjust="qfq")
            df = df.sort_index().tail(252)
            closes = df["close"].dropna().tolist()
            if "volume" in df.columns:
                volumes = df["volume"].dropna().tolist()
        except Exception as e:
            logger.warning("Price data failed for %s: %s", symbol, e)

        pe, pb = quote_job.result()
        mkt_closes: list[float] = mkt_job.result()

    # ── Compute each score ────────────────────────────────────────────────────
    scores: dict[str, int] = {}

    # Valuation: PE range 5–80; lower PE = higher score
    if pe and pe > 0:
        scores["valuation"] = round(_clamp((80 - pe) / 75 * 100))
    else:
        scores["valuation"] = 50

    # PB: range 0.5–15; lower = higher score
    if pb and pb > 0:
        scores["pb"] = round(_clamp((15 - pb) / 14.5 * 100))
    else:
        scores["pb"] = 50

    if len(closes) >= 20:
        arr = np.array(closes, dtype=float)
        rets = np.diff(arr) / arr[:-1]

        # Momentum: total 1-year return, mapped from [-50%, +100%] → [0, 100]
        total_ret = (closes[-1] - closes[0]) / closes[0] * 100
        scores["momentum"] = round(_clamp((total_ret + 50) / 150 * 100))

        # Stability: inverse of annualised volatility (0%–80% ann vol → 100–0)
        ann_vol = float(np.std(rets) * np.sqrt(252) * 100)
        scores["stability"] = round(_clamp((80 - ann_vol) / 80 * 100))

        # Volume activity: recent 30d avg vs full-year avg (ratio 0.3–2.0 → 0–100)
        if len(volumes) >= 30:
            recent_avg = float(np.mean(volumes[-30:]))
            full_avg = float(np.mean(volumes)) if volumes else recent_avg
            ratio = recent_avg / full_avg if full_avg > 0 else 1.0
            scores["volume"] = round(_clamp((ratio - 0.3) / 1.7 * 100))
        else:
            scores["volume"] = 50

        # Market correlation: Pearson corr of daily returns with CSI 300, mapped [-1,1]→[0,100]
        if len(mkt_closes) >= 21:
            n = min(len(rets), len(mkt_closes) - 1)
            mkt_arr = np.array(mkt_closes[-(n + 1):], dtype=float)
            mkt_rets = np.diff(mkt_arr) / mkt_arr[:-1]
            stock_rets = rets[-n:]
            if n >= 10:
                corr = float(np.corrcoef(stock_rets, mkt_rets)[0, 1])
                if not math.isnan(corr):
                    scores["similarity"] = round(_clamp((corr + 1) / 2 * 100))
                else:
                    scores["similarity"] = 50
            else:
                scores["similarity"] = 50
        else:
            scores["similarity"] = 50
    else:
        scores.update({"momentum": 50, "stability": 50, "volume": 50, "similarity": 50})

    return scores


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{symbol}")
def get_radar(symbol: str):
    """
    Returns 6 radar dimension scores (0-100) for `symbol`.
    Cached for 1 hour per symbol.
    """
    now = time.time()
    if symbol in _cache:
        ts, cached = _cache[symbol]
        if now - ts < _CACHE_TTL:
            return cached

    try:
        if _is_us(symbol):
            sym = symbol.upper().replace("-", ".")
            if not sym.replace(".", "").isalnum() or len(sym) > 10:
                raise HTTPException(status_code=404, detail="Unknown symbol")
            scores, name = _compute_us(sym)
        else:
            scores = _compute(symbol)
            name = _get_name(symbol)
        result = {"symbol": symbol, "name": name, "scores": scores}
        _cache[symbol] = (now, result)
        logger.info("Radar computed for %s: %s", symbol, scores)
        return result
    except Exception as exc:
        logger.exception("Radar error for %s", symbol)
        from security import internal_error
        raise internal_error() from exc
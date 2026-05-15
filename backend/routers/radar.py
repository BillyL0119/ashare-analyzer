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
Data sources: akshare (price), yfinance (PE/PB).
"""

from fastapi import APIRouter, HTTPException
import akshare as ak
import numpy as np
import math
import time
import logging

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
    if symbol.startswith(("6", "5", "11")):
        return "sh" + symbol
    return "sz" + symbol


def _to_yf(symbol: str) -> str:
    return f"{symbol}.SS" if symbol.startswith("6") else f"{symbol}.SZ"


def _get_name(symbol: str) -> str:
    """Try to get Chinese stock name via akshare individual info."""
    try:
        df = ak.stock_individual_info_em(symbol=symbol)
        row = df[df["项目"] == "股票简称"]
        if not row.empty:
            return str(row.iloc[0]["数值"])
    except Exception:
        pass
    return symbol


# ── Score computation ─────────────────────────────────────────────────────────

def _compute(symbol: str) -> dict:
    # ── Price data (1 year daily) ────────────────────────────────────────────
    closes: list[float] = []
    volumes: list[float] = []
    try:
        df = ak.stock_zh_a_daily(symbol=_to_sina(symbol), adjust="qfq")
        df = df.sort_index().tail(252)
        closes = df["close"].dropna().tolist()
        if "volume" in df.columns:
            volumes = df["volume"].dropna().tolist()
    except Exception as e:
        logger.warning("Price data failed for %s: %s", symbol, e)

    # ── PE / PB from yfinance ────────────────────────────────────────────────
    pe: float | None = None
    pb: float | None = None
    try:
        import yfinance as yf
        info = yf.Ticker(_to_yf(symbol)).info
        pe = _safe(info.get("trailingPE") or info.get("forwardPE"))
        pb = _safe(info.get("priceToBook"))
    except Exception as e:
        logger.warning("yfinance failed for %s: %s", symbol, e)

    # ── CSI 300 for market correlation ───────────────────────────────────────
    mkt_closes: list[float] = []
    try:
        mkt_df = ak.stock_zh_index_daily(symbol="sh000300")
        mkt_df = mkt_df.sort_index().tail(252)
        mkt_closes = mkt_df["close"].dropna().tolist()
    except Exception as e:
        logger.debug("CSI 300 data failed: %s", e)

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
        scores = _compute(symbol)
        name = _get_name(symbol)
        result = {"symbol": symbol, "name": name, "scores": scores}
        _cache[symbol] = (now, result)
        logger.info("Radar computed for %s: %s", symbol, scores)
        return result
    except Exception as exc:
        logger.exception("Radar error for %s", symbol)
        raise HTTPException(status_code=500, detail=f"服务器内部错误：{exc}") from exc

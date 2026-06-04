"""
Market overview — /api/market/overview

Returns A-share market overview: main indices, advance/decline, total volume,
northbound flow, and sector performance. Data cached 5 minutes.
"""

from fastapi import APIRouter, BackgroundTasks
import asyncio
import akshare as ak
import pandas as pd
import json
import os
import time
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter()
logger = logging.getLogger("market")

_CACHE_TTL = 300
_cache_ts: float = 0
_cache_data: dict | None = None

_SECTORS_TTL = 600  # 10 minutes
_sectors_ts: float = 0
_sectors_data: dict | None = None

_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
try:
    with open(_MAP_PATH, "r", encoding="utf-8") as _f:
        _INDUSTRY_MAP: dict = json.load(_f)
except Exception:
    _INDUSTRY_MAP = {"industries": {}}


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _build_sector_performance(spot_df: pd.DataFrame) -> list:
    try:
        codes = spot_df["代码"].astype(str)
        pcts = pd.to_numeric(spot_df["涨跌幅"], errors="coerce")
        price_map = dict(zip(codes, pcts))
        sectors = []
        for name, code_list in _INDUSTRY_MAP.get("industries", {}).items():
            vals = [price_map[c] for c in code_list
                    if c in price_map and not pd.isna(price_map[c])]
            if vals:
                sectors.append({"name": name, "change_pct": round(sum(vals) / len(vals), 2)})
        sectors.sort(key=lambda x: x["change_pct"], reverse=True)
        return sectors
    except Exception as e:
        logger.warning("Sector performance failed: %s", e)
        return []


@router.get("/overview")
def market_overview():
    global _cache_ts, _cache_data

    now = time.time()
    if _cache_data is not None and now - _cache_ts < _CACHE_TTL:
        return _cache_data

    result: dict = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M"),
        "advance_count": 0,
        "decline_count": 0,
        "flat_count": 0,
        "total_volume": "N/A",
        "shanghai_index": None,
        "shenzhen_index": None,
        "chinext_index": None,
        "northbound_flow": "N/A",
        "sector_performance": [],
    }

    # Spot data: advance/decline counts, volume, sector perf
    spot_df = None
    try:
        spot_df = ak.stock_zh_a_spot_em()
        pct = pd.to_numeric(spot_df["涨跌幅"], errors="coerce")
        result["advance_count"] = int((pct > 0).sum())
        result["decline_count"] = int((pct < 0).sum())
        result["flat_count"]    = int((pct == 0).sum())
        vol = pd.to_numeric(spot_df["成交额"], errors="coerce").sum()
        result["total_volume"]  = f"{vol / 1e8:.0f}亿"
        result["sector_performance"] = _build_sector_performance(spot_df)
    except Exception as e:
        logger.warning("stock_zh_a_spot_em failed: %s", e)

    # Index data
    for sym_param in ("上证系列指数", "深证系列指数"):
        try:
            df = ak.stock_zh_index_spot_em(symbol=sym_param)
            for _, row in df.iterrows():
                name = str(row.get("名称", ""))
                entry = {
                    "value":      _safe_float(row.get("最新价", 0)),
                    "change":     _safe_float(row.get("涨跌额", 0)),
                    "change_pct": round(_safe_float(row.get("涨跌幅", 0)) / 100, 4),
                }
                if ("上证指数" in name or "上综指" in name) and not result["shanghai_index"]:
                    result["shanghai_index"] = entry
                elif ("深证成指" in name or "深成指" in name) and not result["shenzhen_index"]:
                    result["shenzhen_index"] = entry
                elif "创业板指" in name and not result["chinext_index"]:
                    result["chinext_index"] = entry
        except Exception as e:
            logger.warning("Index %s failed: %s", sym_param, e)

    # Northbound flow
    try:
        nf = ak.stock_hsgt_north_net_flow_in_em(symbol="沪股通")
        if nf is not None and not nf.empty:
            val = _safe_float(nf.iloc[-1].get("净流入", 0))
            sign = "+" if val >= 0 else ""
            result["northbound_flow"] = f"{sign}{val / 1e8:.1f}亿"
    except Exception as e:
        logger.warning("Northbound flow failed: %s", e)

    _cache_ts   = now
    _cache_data = result
    return result


@router.get("/sectors")
def market_sectors():
    """Return per-industry average change_pct with leader stock, cached 10 min."""
    global _sectors_ts, _sectors_data

    now = time.time()
    if _sectors_data is not None and now - _sectors_ts < _SECTORS_TTL:
        return _sectors_data

    # Fetch live spot data once
    spot_df = None
    try:
        spot_df = ak.stock_zh_a_spot_em()
    except Exception as e:
        logger.warning("sectors: spot_em failed: %s", e)

    sectors = []
    for industry_name, code_list in _INDUSTRY_MAP.get("industries", {}).items():
        sample = code_list[:5]  # top 5 stocks per industry
        changes = []
        leader_code = ""
        leader_name = ""
        leader_pct = None

        if spot_df is not None:
            try:
                codes_str = spot_df["代码"].astype(str)
                for code in sample:
                    row = spot_df[codes_str == code]
                    if row.empty:
                        continue
                    pct = pd.to_numeric(row.iloc[0].get("涨跌幅", None), errors="coerce")
                    if pd.isna(pct):
                        continue
                    name = str(row.iloc[0].get("名称", code))
                    changes.append(pct)
                    if leader_pct is None or pct > leader_pct:
                        leader_pct = pct
                        leader_code = code
                        leader_name = name
            except Exception as e:
                logger.warning("sectors: parsing row for %s: %s", industry_name, e)

        avg_pct = round(sum(changes) / len(changes), 2) if changes else 0.0
        sectors.append({
            "name": industry_name,
            "change_pct": avg_pct,
            "leader": leader_name,
            "leader_code": leader_code,
        })

    sectors.sort(key=lambda x: x["change_pct"], reverse=True)
    result = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "sectors": sectors,
    }
    _sectors_ts = now
    _sectors_data = result
    return result


# ── Global Market Sentiment ──────────────────────────────────────────────────

_SENTIMENT_TTL = 1800  # 30 minutes
_sentiment_ts: float = 0
_sentiment_data: dict | None = None
_sentiment_fetching: bool = False

_DEFAULT_SENTIMENT = {
    "us_sentiment": {"score": 50.0, "label_zh": "中性", "label_en": "Neutral", "vix": None},
    "cn_sentiment": {"score": 50.0, "label_zh": "中性", "label_en": "Neutral"},
    "indices": [],
    "updated_at": None,
}

_GLOBAL_INDEX_META: dict = {
    "^GSPC":  {"name": "S&P 500",    "name_zh": "标普500",  "region": "us"},
    "^IXIC":  {"name": "NASDAQ",     "name_zh": "纳斯达克", "region": "us"},
    "^DJI":   {"name": "Dow Jones",  "name_zh": "道琼斯",   "region": "us"},
    "^N225":  {"name": "Nikkei 225", "name_zh": "日经225",  "region": "jp"},
    "^HSI":   {"name": "Hang Seng",  "name_zh": "恒生指数", "region": "hk"},
    "^FTSE":  {"name": "FTSE 100",   "name_zh": "富时100",  "region": "uk"},
    "^GDAXI": {"name": "DAX",        "name_zh": "DAX",       "region": "de"},
}


def _yf_history(symbol: str, period: str = "1y") -> dict:
    try:
        import yfinance as yf
        hist = yf.Ticker(symbol).history(period=period)
        if len(hist) < 2:
            return {}
        last = float(hist["Close"].iloc[-1])
        prev = float(hist["Close"].iloc[-2])
        return {
            "close": round(last, 2),
            "change_pct": round((last - prev) / prev * 100, 2),
            "hist": hist,
        }
    except Exception as e:
        logger.debug("yf %s: %s", symbol, e)
        return {}


def _yf_batch(symbols: list, period: str = "1y") -> dict:
    """Batch-download multiple tickers in a single yf.download() request.
    Returns {symbol: {"close": float, "change_pct": float, "hist": df}} or {symbol: {}}.
    One HTTP request is far less likely to trigger Yahoo Finance rate limiting than
    N parallel Ticker().history() calls.
    """
    try:
        import yfinance as yf
        data = yf.download(
            tickers=" ".join(symbols),
            period=period,
            group_by="ticker",
            progress=False,
            threads=False,
            auto_adjust=True,
        )
        result: dict = {}
        multi = len(symbols) > 1
        for sym in symbols:
            try:
                hist = data[sym] if multi else data
                # Drop rows where Close is NaN
                hist = hist.dropna(subset=["Close"])
                if len(hist) < 2:
                    result[sym] = {}
                    continue
                last = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2])
                result[sym] = {
                    "close": round(last, 2),
                    "change_pct": round((last - prev) / prev * 100, 2),
                    "hist": hist,
                }
            except Exception as e:
                logger.debug("yf_batch %s: %s", sym, e)
                result[sym] = {}
        return result
    except Exception as e:
        logger.warning("yf_batch download failed: %s", e)
        # Fallback: individual calls
        return {sym: _yf_history(sym, period) for sym in symbols}


def _calc_rsi(hist: pd.DataFrame, period: int = 14) -> float:
    try:
        delta = hist["Close"].diff()
        gain = delta.clip(lower=0).rolling(period).mean()
        loss = (-delta.clip(upper=0)).rolling(period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        v = float(rsi.iloc[-1])
        return v if v == v else 50.0
    except Exception:
        return 50.0


def _vix_score(vix_val: float) -> float:
    """VIX < 12 → greed (100), VIX > 40 → fear (0)."""
    vix_val = max(8.0, min(80.0, float(vix_val)))
    return round((80.0 - vix_val) / (80.0 - 8.0) * 100, 1)


def _dist_score(hist: pd.DataFrame) -> float:
    """Proximity to 52-week high → 0-100 (at high = 100)."""
    try:
        high = float(hist["Close"].max())
        cur  = float(hist["Close"].iloc[-1])
        pct_below = (high - cur) / high * 100
        return max(0.0, min(100.0, 100.0 - pct_below * 5))
    except Exception:
        return 50.0


def _breadth_score(advance: int, decline: int) -> float:
    total = advance + decline
    return round(advance / total * 100, 1) if total > 0 else 50.0


def _score_label(score: float) -> tuple:
    if score < 25: return ("极度恐慌", "Extreme Fear")
    if score < 45: return ("恐慌",     "Fear")
    if score < 55: return ("中性",     "Neutral")
    if score < 75: return ("贪婪",     "Greed")
    return ("极度贪婪", "Extreme Greed")


def _do_fetch_sentiment() -> dict:
    """Blocking fetch of all sentiment data. Writes to globals when done."""
    global _sentiment_ts, _sentiment_data, _sentiment_fetching
    if _sentiment_fetching:
        return _sentiment_data or _DEFAULT_SENTIMENT
    _sentiment_fetching = True
    try:
        # Single batch download — one request instead of 8+ parallel to avoid rate limiting
        fetch_syms = list(_GLOBAL_INDEX_META.keys()) + ["^VIX", "000001.SS"]
        raw = _yf_batch(fetch_syms, "1y")

        # ── US score: fallback chain ^GSPC → ^DJI → ^IXIC ──────────────────
        vix_d = raw.get("^VIX", {})
        vix_close = vix_d.get("close")
        vix_s = _vix_score(vix_close) if vix_close else None

        us_hist = None
        for sym in ("^GSPC", "^DJI", "^IXIC"):
            h = raw.get(sym, {}).get("hist")
            if h is not None and len(h) >= 16:
                us_hist = h
                logger.info("us sentiment using %s hist", sym)
                break

        if us_hist is not None:
            rsi_s  = _calc_rsi(us_hist)
            dist_s = _dist_score(us_hist)
            components = [rsi_s, dist_s]
            if vix_s is not None:
                components.append(vix_s)
            us_score = round(sum(components) / len(components), 1)
            logger.info("us score: rsi=%.1f dist=%.1f vix=%s → %.1f",
                        rsi_s, dist_s, f"{vix_s:.1f}" if vix_s else "N/A", us_score)
        elif vix_s is not None:
            us_score = round(vix_s, 1)
            logger.info("us score (vix-only): %.1f", us_score)
        else:
            us_score = 50.0
            logger.warning("us score: no data available, using 50.0")

        # ── CN score: breadth + Shanghai RSI, each optional ─────────────────
        cn_components = []

        try:
            spot_df = ak.stock_zh_a_spot_em()
            pct_col = pd.to_numeric(spot_df["涨跌幅"], errors="coerce")
            adv = int((pct_col > 0).sum())
            dec = int((pct_col < 0).sum())
            b = _breadth_score(adv, dec)
            cn_components.append(b)
            logger.info("cn breadth: adv=%d dec=%d → %.1f", adv, dec, b)
        except Exception as e:
            logger.warning("cn breadth failed: %s", e)

        # Shanghai RSI: from batch (000001.SS already fetched) → akshare daily fallback
        sh_hist = raw.get("000001.SS", {}).get("hist")
        if sh_hist is not None and len(sh_hist) >= 16:
            logger.info("cn rsi using 000001.SS from batch")
        else:
            sh_hist = None
        if sh_hist is None:
            try:
                sh_df = ak.stock_zh_index_daily(symbol="sh000001")
                sh_df = sh_df.rename(columns={"close": "Close"}).tail(60)
                if len(sh_df) >= 16:
                    sh_hist = sh_df
                    logger.info("cn rsi using akshare daily sh000001")
            except Exception as e:
                logger.warning("cn shanghai daily akshare: %s", e)

        if sh_hist is not None:
            sh_rsi = _calc_rsi(sh_hist)
            cn_components.append(sh_rsi)
            logger.info("cn rsi=%.1f", sh_rsi)

        cn_score = round(sum(cn_components) / len(cn_components), 1) if cn_components else 50.0
        logger.info("cn score: components=%s → %.1f", cn_components, cn_score)

        # ── Global indices list ──────────────────────────────────────────────
        indices = []
        for sym, meta in _GLOBAL_INDEX_META.items():
            d = raw.get(sym, {})
            indices.append({
                "symbol":     sym,
                "name":       meta["name"],
                "name_zh":    meta["name_zh"],
                "region":     meta["region"],
                "close":      d.get("close"),
                "change_pct": d.get("change_pct"),
            })

        # CN indices: stock_zh_index_spot_em → stock_zh_index_spot_sina fallback
        cn_added = False
        try:
            for param in ("上证系列指数", "深证系列指数"):
                df = ak.stock_zh_index_spot_em(symbol=param)
                for _, row in df.iterrows():
                    nm = str(row.get("名称", ""))
                    if any(k in nm for k in ("上证指数", "深证成指", "创业板指")):
                        indices.append({
                            "symbol":     "—",
                            "name":       nm,
                            "name_zh":    nm,
                            "region":     "cn",
                            "close":      round(_safe_float(row.get("最新价", 0)), 2),
                            "change_pct": round(_safe_float(row.get("涨跌幅", 0)), 2),
                        })
                        cn_added = True
        except Exception as e:
            logger.warning("cn indices spot_em: %s", e)

        if not cn_added:
            try:
                df = ak.stock_zh_index_spot_sina()
                # Match by exact symbol code — avoids substring false-positives
                sina_targets = {
                    "sh000001": "上证指数",
                    "sz399001": "深证成指",
                    "sz399006": "创业板指",
                }
                for _, row in df.iterrows():
                    code = str(row.get("代码", "")).lower().strip()
                    display = sina_targets.get(code)
                    if display:
                        # Sina uses different column names — try both variants
                        close_val = row.get("最新价") or row.get("price") or 0
                        pct_val   = row.get("涨跌幅") or row.get("percent") or 0
                        indices.append({
                            "symbol":     code,
                            "name":       display,
                            "name_zh":    display,
                            "region":     "cn",
                            "close":      round(_safe_float(close_val), 2),
                            "change_pct": round(_safe_float(pct_val), 2),
                        })
                sina_cn = sum(1 for i in indices if i["region"] == "cn")
                logger.info("cn indices via sina fallback: added %d", sina_cn)
            except Exception as e:
                logger.warning("cn indices sina: %s", e)

        us_lbl = _score_label(us_score)
        cn_lbl = _score_label(cn_score)
        result = {
            "us_sentiment": {
                "score":    us_score,
                "label_zh": us_lbl[0],
                "label_en": us_lbl[1],
                "vix":      vix_d.get("close"),
            },
            "cn_sentiment": {
                "score":    cn_score,
                "label_zh": cn_lbl[0],
                "label_en": cn_lbl[1],
            },
            "indices":    indices,
            "updated_at": datetime.now().isoformat(),
        }
        _sentiment_ts   = time.time()
        _sentiment_data = result
        return result
    except Exception as e:
        logger.error("sentiment fetch failed: %s", e)
        return _sentiment_data or _DEFAULT_SENTIMENT
    finally:
        _sentiment_fetching = False


def warmup_sentiment():
    """Called at startup to pre-warm the sentiment cache in background."""
    logger.info("Warming up sentiment cache...")
    _do_fetch_sentiment()
    logger.info("Sentiment cache warmed up.")


@router.get("/sentiment")
async def market_sentiment(background_tasks: BackgroundTasks):
    global _sentiment_ts, _sentiment_data
    now = time.time()

    # Fresh cache — return immediately
    if _sentiment_data is not None and now - _sentiment_ts < _SENTIMENT_TTL:
        return _sentiment_data

    # Stale cache — return stale data now, refresh in background
    if _sentiment_data is not None:
        if not _sentiment_fetching:
            background_tasks.add_task(_do_fetch_sentiment)
        return _sentiment_data

    # No cache — fetch with 8-second timeout, fall back to default
    try:
        loop = asyncio.get_running_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _do_fetch_sentiment),
            timeout=8.0,
        )
        return result
    except asyncio.TimeoutError:
        logger.warning("sentiment fetch timed out, returning default")
        background_tasks.add_task(_do_fetch_sentiment)
        return _DEFAULT_SENTIMENT

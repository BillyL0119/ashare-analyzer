"""
Sector Rotation — /api/sectors/rotation

Returns multi-period sector performance for heatmap + ranking:
  CN (A-share): ~28 industry boards from AkShare stock_board_industry_name_em
  US: 11 S&P sector ETFs via yfinance

Cached 1 hour per market.
"""

from fastapi import APIRouter, Query
import time
import logging
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter()
logger = logging.getLogger("sectors")

_CACHE_TTL = 3600  # 1 hour

_cn_ts: float = 0
_cn_data: dict | None = None

_us_ts: float = 0
_us_data: dict | None = None

# ── US sector ETFs ────────────────────────────────────────────────────────────

_US_ETFS = {
    "XLK":  {"name_en": "Technology",       "name_zh": "科技"},
    "XLF":  {"name_en": "Financials",       "name_zh": "金融"},
    "XLV":  {"name_en": "Health Care",      "name_zh": "医疗健康"},
    "XLE":  {"name_en": "Energy",           "name_zh": "能源"},
    "XLI":  {"name_en": "Industrials",      "name_zh": "工业"},
    "XLP":  {"name_en": "Consumer Staples", "name_zh": "必需消费"},
    "XLY":  {"name_en": "Consumer Discret.","name_zh": "可选消费"},
    "XLB":  {"name_en": "Materials",        "name_zh": "材料"},
    "XLU":  {"name_en": "Utilities",        "name_zh": "公用事业"},
    "XLRE": {"name_en": "Real Estate",      "name_zh": "房地产"},
    "XLC":  {"name_en": "Communication",    "name_zh": "通信服务"},
}

# ── helpers ───────────────────────────────────────────────────────────────────

def _safe_float(val, default=0.0):
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _pct_change_n(series: pd.Series, n: int) -> float:
    """Calculate n-day cumulative % change from a close price series (newest last)."""
    if len(series) < n + 1:
        return 0.0
    old = series.iloc[-(n + 1)]
    new = series.iloc[-1]
    if old == 0:
        return 0.0
    return round((new - old) / abs(old) * 100, 2)


# ── CN sector fetch ───────────────────────────────────────────────────────────

def _fetch_cn_board_hist(row) -> dict | None:
    """Fetch 25-day history for one CN industry board."""
    try:
        import akshare as ak
        name = str(row["板块名称"])
        today_pct = _safe_float(row.get("涨跌幅", 0))
        today_vol  = _safe_float(row.get("成交额", 0))   # 亿元
        leader     = str(row.get("领涨股票", ""))

        end_date   = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=40)).strftime("%Y%m%d")

        hist = ak.stock_board_industry_hist_em(
            symbol=name, period="日k",
            start_date=start_date, end_date=end_date, adjust=""
        )
        if hist is None or hist.empty:
            return {
                "name": name, "name_zh": name, "name_en": name,
                "today_pct": today_pct, "pct_5d": 0.0, "pct_20d": 0.0,
                "vol_ratio": 1.0, "leader": leader,
            }

        # Columns: 日期 开盘 收盘 最高 最低 涨跌幅 涨跌额 成交量 成交额 振幅 换手率
        close = pd.to_numeric(hist["收盘"], errors="coerce").dropna()
        vol   = pd.to_numeric(hist["成交额"], errors="coerce").dropna()

        pct_5d  = _pct_change_n(close, 5)
        pct_20d = _pct_change_n(close, 20)

        # Volume ratio: today vs 20d average
        vol_ratio = 1.0
        if len(vol) >= 21:
            avg20 = vol.iloc[-21:-1].mean()
            if avg20 > 0:
                vol_ratio = round(float(vol.iloc[-1]) / float(avg20), 2)

        return {
            "name":       name,
            "name_zh":    name,
            "name_en":    name,
            "today_pct":  today_pct,
            "pct_5d":     pct_5d,
            "pct_20d":    pct_20d,
            "vol_ratio":  vol_ratio,
            "leader":     leader,
        }
    except Exception as e:
        logger.warning("CN board hist failed for %s: %s", row.get("板块名称", "?"), e)
        return None


def _build_cn() -> dict:
    import akshare as ak

    # Step 1: get all boards with today data
    df = ak.stock_board_industry_name_em()
    rows = df.to_dict("records")

    # Step 2: fetch hist in parallel (max 8 threads to avoid throttling)
    sectors = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(_fetch_cn_board_hist, row): row for row in rows}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                sectors.append(result)

    sectors.sort(key=lambda x: x["today_pct"], reverse=True)
    return {
        "market": "cn",
        "date":   datetime.now().strftime("%Y-%m-%d"),
        "sectors": sectors,
    }


# ── US sector fetch ───────────────────────────────────────────────────────────

def _build_us() -> dict:
    import yfinance as yf

    tickers = list(_US_ETFS.keys())
    # Download 30 trading days of data
    data = yf.download(tickers, period="2mo", progress=False, auto_adjust=True)

    sectors = []
    for sym, meta in _US_ETFS.items():
        try:
            if "Close" in data.columns.get_level_values(0):
                close = data["Close"][sym].dropna()
                vol   = data["Volume"][sym].dropna()
            else:
                close = data[sym]["Close"].dropna()
                vol   = data[sym]["Volume"].dropna()

            today_pct = _pct_change_n(close, 1)
            pct_5d    = _pct_change_n(close, 5)
            pct_20d   = _pct_change_n(close, 20)

            vol_ratio = 1.0
            if len(vol) >= 21:
                avg20 = vol.iloc[-21:-1].mean()
                if avg20 > 0:
                    vol_ratio = round(float(vol.iloc[-1]) / float(avg20), 2)

            sectors.append({
                "name":       sym,
                "name_zh":    meta["name_zh"],
                "name_en":    meta["name_en"],
                "today_pct":  today_pct,
                "pct_5d":     pct_5d,
                "pct_20d":    pct_20d,
                "vol_ratio":  vol_ratio,
                "leader":     sym,
            })
        except Exception as e:
            logger.warning("US ETF %s failed: %s", sym, e)

    sectors.sort(key=lambda x: x["today_pct"], reverse=True)
    return {
        "market": "us",
        "date":   datetime.now().strftime("%Y-%m-%d"),
        "sectors": sectors,
    }


# ── endpoint ──────────────────────────────────────────────────────────────────

@router.get("/rotation")
def sector_rotation(market: str = Query("cn", regex="^(cn|us)$")):
    global _cn_ts, _cn_data, _us_ts, _us_data

    now = time.time()

    if market == "cn":
        if _cn_data is not None and now - _cn_ts < _CACHE_TTL:
            return _cn_data
        try:
            _cn_data = _build_cn()
            _cn_ts   = now
        except Exception as e:
            logger.error("CN sector rotation failed: %s", e)
            if _cn_data:
                return _cn_data
            return {"market": "cn", "date": "", "sectors": [], "error": str(e)}
        return _cn_data

    else:  # us
        if _us_data is not None and now - _us_ts < _CACHE_TTL:
            return _us_data
        try:
            _us_data = _build_us()
            _us_ts   = now
        except Exception as e:
            logger.error("US sector rotation failed: %s", e)
            if _us_data:
                return _us_data
            return {"market": "us", "date": "", "sectors": [], "error": str(e)}
        return _us_data

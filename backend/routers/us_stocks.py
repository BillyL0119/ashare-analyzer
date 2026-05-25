"""
US Stock router — /api/us/*
Data source: Alpha Vantage API (25 calls/day free tier — disk cache is critical)

Endpoints:
  GET /search?q={query}               Search by ticker or company name
  GET /stock/{symbol}                 Historical OHLCV + indicators (legacy, used by useStockData)
  GET /stock/{symbol}/realtime        Real-time quote (15-min memory cache)
  GET /stock/{symbol}/history         Historical OHLCV (7-day disk cache)
  GET /similar/{symbol}               Top-10 peers by Pearson correlation (1-day disk cache)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import time
import requests

router = APIRouter()

AV_KEY  = "30EZ8EJHLMD6HPXP"
AV_BASE = "https://www.alphavantage.co/query"

# ── Disk cache ────────────────────────────────────────────────────────────────
_DISK_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "us_cache")
os.makedirs(_DISK_CACHE_DIR, exist_ok=True)


def _disk_path(filename: str) -> str:
    return os.path.join(_DISK_CACHE_DIR, filename)


def _disk_read(filename: str):
    try:
        with open(_disk_path(filename), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _disk_write(filename: str, data):
    try:
        with open(_disk_path(filename), "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


def _disk_age_days(filename: str) -> float:
    try:
        return (time.time() - os.path.getmtime(_disk_path(filename))) / 86400
    except Exception:
        return float("inf")


# ── Memory cache (realtime only) ───────────────────────────────────────────────
_rt_cache: dict = {}
_RT_TTL = 900  # 15 minutes


# ── Industry map ──────────────────────────────────────────────────────────────
_INDUSTRY_MAP: dict = {}
_INDUSTRY_MAP_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "us_industry_map.json"
)


def _load_industry_map():
    global _INDUSTRY_MAP
    if _INDUSTRY_MAP:
        return
    try:
        with open(_INDUSTRY_MAP_PATH, "r", encoding="utf-8") as f:
            _INDUSTRY_MAP = json.load(f)
    except Exception:
        _INDUSTRY_MAP = {}


_load_industry_map()


# ── Popular tickers for fast local search ─────────────────────────────────────
POPULAR_TICKERS = [
    # Tech
    {"code": "AAPL",  "name": "Apple Inc.",              "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "MSFT",  "name": "Microsoft Corp.",          "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "NVDA",  "name": "NVIDIA Corp.",             "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "GOOGL", "name": "Alphabet Inc. Class A",    "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "GOOG",  "name": "Alphabet Inc. Class C",    "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "AMZN",  "name": "Amazon.com Inc.",          "exchange": "NASDAQ", "sector": "Consumer Discretionary"},
    {"code": "META",  "name": "Meta Platforms Inc.",      "exchange": "NASDAQ", "sector": "Communication Services"},
    {"code": "TSLA",  "name": "Tesla Inc.",               "exchange": "NASDAQ", "sector": "Consumer Discretionary"},
    {"code": "AVGO",  "name": "Broadcom Inc.",            "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "ORCL",  "name": "Oracle Corp.",             "exchange": "NYSE",   "sector": "Technology"},
    {"code": "CRM",   "name": "Salesforce Inc.",          "exchange": "NYSE",   "sector": "Technology"},
    {"code": "AMD",   "name": "Advanced Micro Devices",   "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "INTC",  "name": "Intel Corp.",              "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "QCOM",  "name": "Qualcomm Inc.",            "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "ADBE",  "name": "Adobe Inc.",               "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "NFLX",  "name": "Netflix Inc.",             "exchange": "NASDAQ", "sector": "Communication Services"},
    {"code": "MU",    "name": "Micron Technology",        "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "NOW",   "name": "ServiceNow Inc.",          "exchange": "NYSE",   "sector": "Technology"},
    {"code": "SNOW",  "name": "Snowflake Inc.",           "exchange": "NYSE",   "sector": "Technology"},
    {"code": "PLTR",  "name": "Palantir Technologies",    "exchange": "NYSE",   "sector": "Technology"},
    {"code": "AMAT",  "name": "Applied Materials Inc.",   "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "LRCX",  "name": "Lam Research Corp.",       "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "KLAC",  "name": "KLA Corp.",                "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "MRVL",  "name": "Marvell Technology Inc.",  "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "PANW",  "name": "Palo Alto Networks",       "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "CRWD",  "name": "CrowdStrike Holdings",     "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "FTNT",  "name": "Fortinet Inc.",            "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "DDOG",  "name": "Datadog Inc.",             "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "NET",   "name": "Cloudflare Inc.",          "exchange": "NYSE",   "sector": "Technology"},
    {"code": "ZS",    "name": "Zscaler Inc.",             "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "OKTA",  "name": "Okta Inc.",                "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "TEAM",  "name": "Atlassian Corp.",          "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "MDB",   "name": "MongoDB Inc.",             "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "WDAY",  "name": "Workday Inc.",             "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "VEEV",  "name": "Veeva Systems Inc.",       "exchange": "NYSE",   "sector": "Technology"},
    {"code": "SNPS",  "name": "Synopsys Inc.",            "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "CDNS",  "name": "Cadence Design Systems",   "exchange": "NASDAQ", "sector": "Technology"},
    {"code": "TXN",   "name": "Texas Instruments Inc.",   "exchange": "NASDAQ", "sector": "Technology"},
    # Finance
    {"code": "JPM",   "name": "JPMorgan Chase & Co.",     "exchange": "NYSE",   "sector": "Finance"},
    {"code": "BAC",   "name": "Bank of America Corp.",    "exchange": "NYSE",   "sector": "Finance"},
    {"code": "WFC",   "name": "Wells Fargo & Co.",        "exchange": "NYSE",   "sector": "Finance"},
    {"code": "GS",    "name": "Goldman Sachs Group",      "exchange": "NYSE",   "sector": "Finance"},
    {"code": "MS",    "name": "Morgan Stanley",           "exchange": "NYSE",   "sector": "Finance"},
    {"code": "C",     "name": "Citigroup Inc.",           "exchange": "NYSE",   "sector": "Finance"},
    {"code": "V",     "name": "Visa Inc.",                "exchange": "NYSE",   "sector": "Finance"},
    {"code": "MA",    "name": "Mastercard Inc.",          "exchange": "NYSE",   "sector": "Finance"},
    {"code": "PYPL",  "name": "PayPal Holdings Inc.",     "exchange": "NASDAQ", "sector": "Finance"},
    {"code": "BRK-B", "name": "Berkshire Hathaway B",     "exchange": "NYSE",   "sector": "Finance"},
    {"code": "BLK",   "name": "BlackRock Inc.",           "exchange": "NYSE",   "sector": "Finance"},
    {"code": "SCHW",  "name": "Charles Schwab Corp.",     "exchange": "NYSE",   "sector": "Finance"},
    {"code": "AXP",   "name": "American Express Co.",     "exchange": "NYSE",   "sector": "Finance"},
    {"code": "SPGI",  "name": "S&P Global Inc.",          "exchange": "NYSE",   "sector": "Finance"},
    {"code": "MCO",   "name": "Moody's Corp.",            "exchange": "NYSE",   "sector": "Finance"},
    {"code": "COF",   "name": "Capital One Financial",    "exchange": "NYSE",   "sector": "Finance"},
    {"code": "BX",    "name": "Blackstone Inc.",          "exchange": "NYSE",   "sector": "Finance"},
    {"code": "KKR",   "name": "KKR & Co. Inc.",          "exchange": "NYSE",   "sector": "Finance"},
    # Healthcare
    {"code": "JNJ",   "name": "Johnson & Johnson",        "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "UNH",   "name": "UnitedHealth Group",       "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "LLY",   "name": "Eli Lilly and Co.",        "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "PFE",   "name": "Pfizer Inc.",              "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "ABBV",  "name": "AbbVie Inc.",              "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "MRK",   "name": "Merck & Co. Inc.",         "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "TMO",   "name": "Thermo Fisher Scientific", "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "ABT",   "name": "Abbott Laboratories",      "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "BMY",   "name": "Bristol-Myers Squibb",     "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "AMGN",  "name": "Amgen Inc.",               "exchange": "NASDAQ", "sector": "Healthcare"},
    {"code": "GILD",  "name": "Gilead Sciences Inc.",     "exchange": "NASDAQ", "sector": "Healthcare"},
    {"code": "ISRG",  "name": "Intuitive Surgical Inc.",  "exchange": "NASDAQ", "sector": "Healthcare"},
    {"code": "MDT",   "name": "Medtronic plc",            "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "DHR",   "name": "Danaher Corp.",            "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "CVS",   "name": "CVS Health Corp.",         "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "ELV",   "name": "Elevance Health Inc.",     "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "CI",    "name": "Cigna Group",              "exchange": "NYSE",   "sector": "Healthcare"},
    {"code": "HUM",   "name": "Humana Inc.",              "exchange": "NYSE",   "sector": "Healthcare"},
    # Consumer
    {"code": "WMT",   "name": "Walmart Inc.",             "exchange": "NYSE",   "sector": "Consumer Staples"},
    {"code": "COST",  "name": "Costco Wholesale Corp.",   "exchange": "NASDAQ", "sector": "Consumer Staples"},
    {"code": "HD",    "name": "Home Depot Inc.",          "exchange": "NYSE",   "sector": "Consumer Discretionary"},
    {"code": "MCD",   "name": "McDonald's Corp.",         "exchange": "NYSE",   "sector": "Consumer Discretionary"},
    {"code": "SBUX",  "name": "Starbucks Corp.",          "exchange": "NASDAQ", "sector": "Consumer Discretionary"},
    {"code": "NKE",   "name": "Nike Inc.",                "exchange": "NYSE",   "sector": "Consumer Discretionary"},
    {"code": "KO",    "name": "Coca-Cola Co.",            "exchange": "NYSE",   "sector": "Consumer Staples"},
    {"code": "PEP",   "name": "PepsiCo Inc.",             "exchange": "NASDAQ", "sector": "Consumer Staples"},
    {"code": "PG",    "name": "Procter & Gamble Co.",     "exchange": "NYSE",   "sector": "Consumer Staples"},
    {"code": "PM",    "name": "Philip Morris Intl.",      "exchange": "NYSE",   "sector": "Consumer Staples"},
    {"code": "MDLZ",  "name": "Mondelez International",   "exchange": "NASDAQ", "sector": "Consumer Staples"},
    {"code": "TGT",   "name": "Target Corp.",             "exchange": "NYSE",   "sector": "Consumer Discretionary"},
    {"code": "LOW",   "name": "Lowe's Companies Inc.",    "exchange": "NYSE",   "sector": "Consumer Discretionary"},
    {"code": "BKNG",  "name": "Booking Holdings Inc.",    "exchange": "NASDAQ", "sector": "Consumer Discretionary"},
    {"code": "CMG",   "name": "Chipotle Mexican Grill",   "exchange": "NYSE",   "sector": "Consumer Discretionary"},
    {"code": "LULU",  "name": "Lululemon Athletica",      "exchange": "NASDAQ", "sector": "Consumer Discretionary"},
    # Energy
    {"code": "XOM",   "name": "Exxon Mobil Corp.",        "exchange": "NYSE",   "sector": "Energy"},
    {"code": "CVX",   "name": "Chevron Corp.",            "exchange": "NYSE",   "sector": "Energy"},
    {"code": "COP",   "name": "ConocoPhillips",           "exchange": "NYSE",   "sector": "Energy"},
    {"code": "SLB",   "name": "SLB (Schlumberger)",       "exchange": "NYSE",   "sector": "Energy"},
    {"code": "EOG",   "name": "EOG Resources Inc.",       "exchange": "NYSE",   "sector": "Energy"},
    {"code": "OXY",   "name": "Occidental Petroleum",     "exchange": "NYSE",   "sector": "Energy"},
    {"code": "HAL",   "name": "Halliburton Co.",          "exchange": "NYSE",   "sector": "Energy"},
    # Industrials
    {"code": "BA",    "name": "Boeing Co.",               "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "CAT",   "name": "Caterpillar Inc.",         "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "GE",    "name": "GE Aerospace",             "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "HON",   "name": "Honeywell International",  "exchange": "NASDAQ", "sector": "Industrials"},
    {"code": "UPS",   "name": "United Parcel Service",    "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "RTX",   "name": "RTX Corp.",                "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "LMT",   "name": "Lockheed Martin Corp.",    "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "DE",    "name": "Deere & Company",          "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "NOC",   "name": "Northrop Grumman Corp.",   "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "EMR",   "name": "Emerson Electric Co.",     "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "ETN",   "name": "Eaton Corp. plc",          "exchange": "NYSE",   "sector": "Industrials"},
    {"code": "CTAS",  "name": "Cintas Corp.",             "exchange": "NASDAQ", "sector": "Industrials"},
    {"code": "ADP",   "name": "ADP Inc.",                 "exchange": "NASDAQ", "sector": "Industrials"},
    {"code": "FDX",   "name": "FedEx Corp.",              "exchange": "NYSE",   "sector": "Industrials"},
    # Communication
    {"code": "DIS",   "name": "Walt Disney Co.",          "exchange": "NYSE",   "sector": "Communication Services"},
    {"code": "CMCSA", "name": "Comcast Corp.",            "exchange": "NASDAQ", "sector": "Communication Services"},
    {"code": "T",     "name": "AT&T Inc.",                "exchange": "NYSE",   "sector": "Communication Services"},
    {"code": "VZ",    "name": "Verizon Communications",   "exchange": "NYSE",   "sector": "Communication Services"},
    {"code": "TMUS",  "name": "T-Mobile US Inc.",         "exchange": "NASDAQ", "sector": "Communication Services"},
    {"code": "EA",    "name": "Electronic Arts Inc.",     "exchange": "NASDAQ", "sector": "Communication Services"},
    {"code": "TTWO",  "name": "Take-Two Interactive",     "exchange": "NASDAQ", "sector": "Communication Services"},
    {"code": "RBLX",  "name": "Roblox Corp.",             "exchange": "NYSE",   "sector": "Communication Services"},
    {"code": "SNAP",  "name": "Snap Inc.",                "exchange": "NYSE",   "sector": "Communication Services"},
    {"code": "PINS",  "name": "Pinterest Inc.",           "exchange": "NYSE",   "sector": "Communication Services"},
    {"code": "MTCH",  "name": "Match Group Inc.",         "exchange": "NASDAQ", "sector": "Communication Services"},
    # ETFs
    {"code": "SPY",   "name": "SPDR S&P 500 ETF",         "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "QQQ",   "name": "Invesco QQQ Trust",         "exchange": "NASDAQ", "sector": "SPX_ETF"},
    {"code": "IWM",   "name": "iShares Russell 2000 ETF",  "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "DIA",   "name": "SPDR Dow Jones ETF",        "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "VTI",   "name": "Vanguard Total Stock ETF",  "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "VOO",   "name": "Vanguard S&P 500 ETF",      "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "GLD",   "name": "SPDR Gold Trust",           "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "TLT",   "name": "iShares 20+ Year Treasury", "exchange": "NASDAQ", "sector": "SPX_ETF"},
    {"code": "XLK",   "name": "Technology Select SPDR",    "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "XLF",   "name": "Financial Select SPDR",     "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "XLV",   "name": "Health Care Select SPDR",   "exchange": "NYSE",   "sector": "SPX_ETF"},
    {"code": "XLE",   "name": "Energy Select SPDR",        "exchange": "NYSE",   "sector": "SPX_ETF"},
]


# ── Alpha Vantage helpers ──────────────────────────────────────────────────────

def _av_get(params: dict) -> dict:
    """GET request to Alpha Vantage, returns parsed JSON."""
    params = dict(params)
    params["apikey"] = AV_KEY
    resp = requests.get(AV_BASE, params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _is_rate_limited(data: dict) -> bool:
    return "Note" in data or "Information" in data


# ── Math utilities ────────────────────────────────────────────────────────────

def _safe(v):
    try:
        f = float(v)
        return None if (pd.isna(f) or not np.isfinite(f)) else round(f, 4)
    except Exception:
        return None


def _compute_ma(closes: pd.Series):
    return {f"ma{w}": closes.rolling(w).mean() for w in [5, 10, 20, 60]}


def _compute_macd(closes: pd.Series):
    ema12 = closes.ewm(span=12, adjust=False).mean()
    ema26 = closes.ewm(span=26, adjust=False).mean()
    dif = ema12 - ema26
    dea = dif.ewm(span=9, adjust=False).mean()
    return dif, dea, (dif - dea) * 2


def _compute_rsi(closes: pd.Series):
    result = {}
    for p in [6, 12, 24]:
        delta = closes.diff()
        avg_gain = delta.clip(lower=0).ewm(alpha=1 / p, adjust=False).mean()
        avg_loss = (-delta.clip(upper=0)).ewm(alpha=1 / p, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, float("nan"))
        result[f"rsi{p}"] = 100 - (100 / (1 + rs))
    return result


def _fmt_date(d: Optional[str]) -> Optional[str]:
    if d and len(d) == 8 and "-" not in d:
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    return d


def _period_to_days(period: str) -> int:
    return {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "2y": 730, "5y": 1825}.get(
        period, 365
    )


def _find_sector(symbol: str) -> Optional[str]:
    sym = symbol.upper()
    for sector, tickers in _INDUSTRY_MAP.items():
        if sym in tickers:
            return sector
    for t in POPULAR_TICKERS:
        if t["code"] == sym:
            return t.get("sector")
    return None


# ── Core data fetchers (shared by multiple endpoints) ─────────────────────────

def _fetch_history_candles(sym: str) -> list:
    """
    Fetch full daily adjusted history from AV.
    Returns list of candle dicts sorted by date ASC.
    Disk-cached for 7 days (history doesn't change).
    Raises HTTPException on unrecoverable failure.
    """
    cache_file = f"{sym}_history.json"

    # Fresh disk cache (< 7 days)
    if _disk_age_days(cache_file) < 7:
        cached = _disk_read(cache_file)
        if cached:
            return cached

    data = _av_get({
        "function": "TIME_SERIES_DAILY_ADJUSTED",
        "symbol": sym,
        "outputsize": "full",
    })

    if _is_rate_limited(data):
        # Fall back to stale disk cache rather than failing
        cached = _disk_read(cache_file)
        if cached:
            return cached
        raise HTTPException(
            status_code=429,
            detail="API_LIMIT: API limit reached, please try again tomorrow",
        )

    ts = data.get("Time Series (Daily)", {})
    if not ts:
        raise HTTPException(status_code=404, detail=f"No data for {sym}")

    candles = []
    for date_str, vals in sorted(ts.items()):
        candles.append({
            "date": date_str,
            "open":   _safe(vals.get("1. open")),
            "high":   _safe(vals.get("2. high")),
            "low":    _safe(vals.get("3. low")),
            "close":  _safe(vals.get("5. adjusted close")),
            "volume": int(float(vals.get("6. volume", 0))),
        })

    _disk_write(cache_file, candles)
    return candles


def _fetch_overview(sym: str) -> dict:
    """
    Fetch company overview (name, sector, pe, 52w hi/lo, etc).
    Disk-cached 7 days — does NOT raise on rate limit (returns empty dict).
    """
    cache_file = f"{sym}_overview.json"

    if _disk_age_days(cache_file) < 7:
        cached = _disk_read(cache_file)
        if cached:
            return cached

    try:
        data = _av_get({"function": "OVERVIEW", "symbol": sym})
    except Exception:
        return _disk_read(cache_file) or {}

    if _is_rate_limited(data):
        return _disk_read(cache_file) or {}

    if not data.get("Symbol"):
        return {}

    overview = {
        "name":        data.get("Name", sym),
        "sector":      data.get("Sector", ""),
        "industry":    data.get("Industry", ""),
        "market_cap":  _safe(data.get("MarketCapitalization")),
        "pe_ratio":    _safe(data.get("TrailingPE")),
        "week52_high": _safe(data.get("52WeekHigh")),
        "week52_low":  _safe(data.get("52WeekLow")),
        "exchange":    data.get("Exchange", ""),
    }
    _disk_write(cache_file, overview)
    return overview


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/search")
def search_us_stocks(q: str = Query(..., min_length=1)):
    """Search by ticker symbol or company name. Fast local match + AV fallback."""
    q_lower = q.strip().lower()
    results = []
    seen = set()

    for t in POPULAR_TICKERS:
        if q_lower in t["code"].lower() or q_lower in t["name"].lower():
            if t["code"] not in seen:
                seen.add(t["code"])
                results.append({
                    "code":     t["code"],
                    "name":     t["name"],
                    "exchange": t.get("exchange", ""),
                    "sector":   t.get("sector", ""),
                })
        if len(results) >= 15:
            break

    # AV SYMBOL_SEARCH for tickers not in the popular list
    if not results:
        try:
            data = _av_get({"function": "SYMBOL_SEARCH", "keywords": q.strip()})
            if not _is_rate_limited(data):
                for m in data.get("bestMatches", []):
                    if (
                        m.get("3. type") == "Equity"
                        and m.get("4. region") == "United States"
                    ):
                        results.append({
                            "code":     m.get("1. symbol", ""),
                            "name":     m.get("2. name", ""),
                            "exchange": m.get("4. region", ""),
                            "sector":   "",
                        })
                    if len(results) >= 10:
                        break
        except Exception:
            pass

    return results


@router.get("/stock/{symbol}/realtime")
def get_us_realtime(symbol: str):
    """Real-time US stock quote. Memory cached 15 min."""
    sym = symbol.upper()
    now = time.time()

    if sym in _rt_cache:
        ts, data = _rt_cache[sym]
        if now - ts < _RT_TTL:
            return data

    try:
        gq_data = _av_get({"function": "GLOBAL_QUOTE", "symbol": sym})
    except Exception as e:
        if sym in _rt_cache:
            _, data = _rt_cache[sym]
            return data
        raise HTTPException(status_code=500, detail=str(e))

    if _is_rate_limited(gq_data):
        if sym in _rt_cache:
            _, data = _rt_cache[sym]
            return data
        raise HTTPException(
            status_code=429,
            detail="API_LIMIT: API limit reached, please try again tomorrow",
        )

    gq = gq_data.get("Global Quote", {})
    if not gq or not gq.get("05. price"):
        raise HTTPException(status_code=404, detail=f"No realtime data for {sym}")

    change_pct_raw = gq.get("10. change percent", "0%").replace("%", "")
    overview = _fetch_overview(sym)

    result = {
        "symbol":            sym,
        "name":              overview.get("name") or sym,
        "price":             _safe(gq.get("05. price")),
        "change":            _safe(gq.get("09. change")),
        "change_pct":        _safe(change_pct_raw),
        "volume":            int(float(gq.get("06. volume", 0))),
        "latest_trading_day": gq.get("07. latest trading day", ""),
        "market_cap":        overview.get("market_cap"),
        "pe_ratio":          overview.get("pe_ratio"),
        "week52_high":       overview.get("week52_high"),
        "week52_low":        overview.get("week52_low"),
        "sector":            overview.get("sector", ""),
        "industry":          overview.get("industry", ""),
        "exchange":          overview.get("exchange", ""),
    }
    _rt_cache[sym] = (now, result)
    return result


@router.get("/stock/{symbol}/history")
def get_us_history(symbol: str, period: str = "1y", interval: str = "1d"):
    """Historical OHLCV. Disk-cached 7 days."""
    sym = symbol.upper()
    all_candles = _fetch_history_candles(sym)

    days = _period_to_days(period)
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    candles = [c for c in all_candles if c["date"] >= cutoff]

    for i, c in enumerate(candles):
        if i == 0:
            c["pct_change"] = None
        else:
            prev = candles[i - 1]["close"]
            cur = c["close"]
            c["pct_change"] = (
                round((cur - prev) / prev * 100, 4) if prev and cur else None
            )

    return {"symbol": sym, "candles": candles}


@router.get("/similar/{symbol}")
def get_us_similar(symbol: str):
    """Top-10 peers by Pearson correlation on daily returns. Disk-cached 1 day."""
    sym = symbol.upper()
    today = datetime.now().strftime("%Y%m%d")
    sim_file = f"{sym}_similar_{today}.json"

    cached = _disk_read(sim_file)
    if cached:
        return cached

    _load_industry_map()
    sector = _find_sector(sym)

    candidates: list = []
    if sector and sector in _INDUSTRY_MAP:
        candidates = [s for s in _INDUSTRY_MAP[sector] if s != sym]
    else:
        for tickers in _INDUSTRY_MAP.values():
            for s in tickers:
                if s != sym and s not in candidates:
                    candidates.append(s)

    if not candidates:
        return {"symbol": sym, "sector": sector or "", "results": []}

    candidates = candidates[:12]

    def _get_closes(ticker_sym: str):
        try:
            all_c = _fetch_history_candles(ticker_sym)
            recent = all_c[-252:] if len(all_c) > 252 else all_c
            closes = [c["close"] for c in recent if c["close"] is not None]
            sparkline = [c["close"] for c in all_c[-20:] if c["close"] is not None]
            return closes, sparkline
        except Exception:
            return [], []

    ref_closes, _ = _get_closes(sym)
    if len(ref_closes) < 20:
        return {"symbol": sym, "sector": sector or "", "results": [], "rate_limited": True}

    ref_series = pd.Series(ref_closes, dtype=float).pct_change().dropna()

    results = []
    for peer in candidates:
        peer_closes, sparkline = _get_closes(peer)
        if len(peer_closes) < 20:
            continue
        peer_series = pd.Series(peer_closes, dtype=float).pct_change().dropna()
        min_len = min(len(ref_series), len(peer_series))
        combined = pd.DataFrame({
            "ref":  ref_series.iloc[-min_len:].values,
            "peer": peer_series.iloc[-min_len:].values,
        }).dropna()
        if len(combined) < 20:
            continue
        corr = float(combined["ref"].corr(combined["peer"]))
        if np.isnan(corr):
            continue
        peer_name = next(
            (tk["name"] for tk in POPULAR_TICKERS if tk["code"] == peer), peer
        )
        results.append({
            "code":        peer,
            "name":        peer_name,
            "correlation": round(corr, 4),
            "sparkline":   sparkline,
            "sector":      sector or "",
        })

    results.sort(key=lambda x: x["correlation"], reverse=True)
    results = results[:10]

    response = {"symbol": sym, "sector": sector or "", "results": results}
    _disk_write(sim_file, response)
    return response


# ── Legacy endpoint (backward compat with useStockData / getUSStockHistory) ───

@router.get("/stock/{symbol}")
def get_us_stock(
    symbol: str,
    period: str = "daily",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    sym = symbol.upper()
    all_candles = _fetch_history_candles(sym)

    start = _fmt_date(start_date) or (datetime.now() - timedelta(days=365)).strftime(
        "%Y-%m-%d"
    )
    end = _fmt_date(end_date) or datetime.now().strftime("%Y-%m-%d")
    candles_raw = [c for c in all_candles if start <= c["date"] <= end]

    if not candles_raw:
        raise HTTPException(status_code=404, detail=f"No data found for {sym}")

    closes = pd.Series([c["close"] for c in candles_raw], dtype=float)
    ma = _compute_ma(closes)
    dif, dea, macd_hist = _compute_macd(closes)
    rsi = _compute_rsi(closes)
    pct = closes.pct_change() * 100

    candles = [
        {
            "date":       c["date"],
            "open":       c["open"],
            "high":       c["high"],
            "low":        c["low"],
            "close":      c["close"],
            "volume":     c["volume"],
            "amount":     round(c["close"] * c["volume"], 2)
                          if c["close"] and c["volume"]
                          else None,
            "pct_change": _safe(pct.iloc[i]),
            "turnover":   0,
        }
        for i, c in enumerate(candles_raw)
    ]

    dates = [c["date"] for c in candles_raw]

    ma_data = [
        {
            "date": d,
            "ma5":  _safe(ma["ma5"].iloc[i]),
            "ma10": _safe(ma["ma10"].iloc[i]),
            "ma20": _safe(ma["ma20"].iloc[i]),
            "ma60": _safe(ma["ma60"].iloc[i]),
        }
        for i, d in enumerate(dates)
    ]

    macd_data = [
        {
            "date": d,
            "dif":  _safe(dif.iloc[i]),
            "dea":  _safe(dea.iloc[i]),
            "macd": _safe(macd_hist.iloc[i]),
        }
        for i, d in enumerate(dates)
    ]

    rsi_data = [
        {
            "date":  d,
            "rsi6":  _safe(rsi["rsi6"].iloc[i]),
            "rsi12": _safe(rsi["rsi12"].iloc[i]),
            "rsi24": _safe(rsi["rsi24"].iloc[i]),
        }
        for i, d in enumerate(dates)
    ]

    overview = _fetch_overview(sym)

    return {
        "symbol": sym,
        "name":   overview.get("name") or sym,
        "candles": candles,
        "ma":      ma_data,
        "macd":    macd_data,
        "rsi":     rsi_data,
    }

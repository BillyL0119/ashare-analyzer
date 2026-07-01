"""
US Stock router — /api/us/*
Data source: Polygon.io API (disk cache is critical for free tier)

Endpoints:
  GET /search?q={query}               Search by ticker or company name
  GET /stock/{symbol}                 Historical OHLCV + indicators (legacy)
  GET /stock/{symbol}/realtime        Previous-day quote (1-hour disk cache)
  GET /stock/{symbol}/history         Historical OHLCV (cached until next day)
  GET /similar/{symbol}               Top-10 peers by Pearson correlation (1-day disk cache)
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from typing import Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import time
import requests

router = APIRouter()

POLYGON_KEY  = "ni5ftWPpA88XtLZPAlE35rohnEwIjFoH"
POLYGON_BASE = "https://api.polygon.io"

# ── Disk cache ────────────────────────────────────────────────────────────────
CACHE_DIR = os.path.join(os.path.dirname(__file__), "../data/us_cache")
os.makedirs(CACHE_DIR, exist_ok=True)


def read_cache(key: str, max_age_hours: float = 24):
    path = os.path.join(CACHE_DIR, f"{key}.json")
    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)
        if age < max_age_hours * 3600:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return None


def write_cache(key: str, data):
    path = os.path.join(CACHE_DIR, f"{key}.json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


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


# ── Math utilities (used by legacy endpoint) ──────────────────────────────────

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


# ── Polygon.io helpers ────────────────────────────────────────────────────────

def _polygon_get(path: str, params: dict = None) -> dict:
    """GET request to Polygon.io, returns parsed JSON."""
    p = dict(params or {})
    p["apiKey"] = POLYGON_KEY
    resp = requests.get(f"{POLYGON_BASE}{path}", params=p, timeout=20)
    resp.raise_for_status()
    return resp.json()


# ── Core data fetchers ────────────────────────────────────────────────────────

def _find_recent_history_cache(sym: str, max_days: int = 7) -> list:
    """Return the most recently cached history for sym within max_days, or []."""
    prefix = f"{sym}_history_"
    best_path = None
    best_age = max_days + 1
    try:
        for fname in os.listdir(CACHE_DIR):
            if fname.startswith(prefix) and fname.endswith(".json"):
                date_str = fname[len(prefix):-5]
                try:
                    file_date = datetime.strptime(date_str, "%Y-%m-%d")
                    age = (datetime.now() - file_date).days
                    if age < best_age:
                        best_age = age
                        best_path = os.path.join(CACHE_DIR, fname)
                except Exception:
                    pass
    except Exception:
        pass
    if best_path:
        try:
            with open(best_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _fetch_history_candles(sym: str, days: int = 365) -> list:
    """
    Fetch daily OHLCV from Polygon aggregates.
    Returns list of candle dicts sorted by date ASC.
    Cached until next calendar day. Falls back to recent stale cache on API error.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    cache_key = f"{sym}_history_{today}"
    cached = read_cache(cache_key, max_age_hours=24)
    if cached:
        return cached

    to_date = datetime.now().strftime("%Y-%m-%d")
    from_date = (datetime.now() - timedelta(days=max(days, 365))).strftime("%Y-%m-%d")

    try:
        data = _polygon_get(
            f"/v2/aggs/ticker/{sym}/range/1/day/{from_date}/{to_date}",
            {"adjusted": "true", "sort": "asc", "limit": 365},
        )

        results = data.get("results", [])
        if not results:
            # No data from API — fall back to recent stale cache
            return _find_recent_history_cache(sym, max_days=7)

        candles = []
        for bar in results:
            ts_ms = bar.get("t", 0)
            date_str = datetime.utcfromtimestamp(ts_ms / 1000).strftime("%Y-%m-%d")
            candles.append({
                "date":   date_str,
                "open":   round(bar.get("o", 0), 4),
                "high":   round(bar.get("h", 0), 4),
                "low":    round(bar.get("l", 0), 4),
                "close":  round(bar.get("c", 0), 4),
                "volume": int(bar.get("v", 0)),
            })

        write_cache(cache_key, candles)
        return candles

    except Exception:
        # API failed (rate limit, network, etc.) — use most recent stale cache
        return _find_recent_history_cache(sym, max_days=7)


def _fetch_company_info(sym: str) -> dict:
    """
    Fetch company reference data from Polygon.
    Cached 7 days.
    """
    cache_key = f"{sym}_info"
    cached = read_cache(cache_key, max_age_hours=7 * 24)
    if cached:
        return cached

    data = _polygon_get(f"/v3/reference/tickers/{sym}")
    res = data.get("results", {})
    if not res:
        return {}

    branding = res.get("branding", {})
    info = {
        "name":         res.get("name", sym),
        "sector":       res.get("sic_description", ""),
        "industry":     res.get("sic_description", ""),
        "market_cap":   res.get("market_cap"),
        "employees":    res.get("total_employees"),
        "description":  res.get("description", ""),
        "homepage_url": res.get("homepage_url", ""),
        "exchange":     res.get("primary_exchange", ""),
    }
    write_cache(cache_key, info)
    return info


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stock/{symbol}/history")
def get_us_history(symbol: str, period: str = "1y"):
    sym = symbol.upper()
    days = _period_to_days(period)

    try:
        all_candles = _fetch_history_candles(sym, days)
        if not all_candles:
            cached = read_cache(f"{sym}_history_{datetime.now().strftime('%Y-%m-%d')}", max_age_hours=9999)
            if cached:
                return {"symbol": sym, "data": cached, "cached": True}
            return JSONResponse({"error": "Unable to load data", "cached": False}, status_code=502)

        cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        candles = [c for c in all_candles if c["date"] >= cutoff]
        return {"symbol": sym, "data": candles}

    except Exception:
        # Try any stale cache on failure
        for stale_hours in [9999]:
            cached = read_cache(f"{sym}_history_{datetime.now().strftime('%Y-%m-%d')}", max_age_hours=stale_hours)
            if cached:
                cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
                return {"symbol": sym, "data": [c for c in cached if c["date"] >= cutoff], "cached": True}
        return JSONResponse({"error": "Unable to load data", "cached": False}, status_code=502)


@router.get("/stock/{symbol}/realtime")
def get_us_realtime(symbol: str):
    sym = symbol.upper()

    try:
        # Price: cache 1 hour
        price_cache_key = f"{sym}_realtime"
        price_data = read_cache(price_cache_key, max_age_hours=1)

        if not price_data:
            prev = _polygon_get(
                f"/v2/aggs/ticker/{sym}/prev",
                {"adjusted": "true"},
            )
            bars = prev.get("results", [])
            if bars:
                bar = bars[0]
                close  = bar.get("c", 0)
                open_  = bar.get("o", 0)
                change     = round(close - open_, 4)
                change_pct = round((change / open_ * 100), 4) if open_ else 0
                price_data = {
                    "price":      round(close, 4),
                    "change":     change,
                    "change_pct": change_pct,
                    "volume":     int(bar.get("v", 0)),
                }
                write_cache(price_cache_key, price_data)

        # Company info: cache 7 days
        info = {}
        try:
            info = _fetch_company_info(sym)
        except Exception:
            info = read_cache(f"{sym}_info", max_age_hours=9999) or {}

        # 52-week high/low from 1-year history
        week52_high = None
        week52_low  = None
        try:
            hist = _fetch_history_candles(sym, 365)
            if hist:
                highs = [c["high"] for c in hist if c["high"]]
                lows  = [c["low"]  for c in hist if c["low"]]
                week52_high = max(highs) if highs else None
                week52_low  = min(lows)  if lows  else None
        except Exception:
            pass

        if not price_data:
            cached_rt = read_cache(f"{sym}_realtime", max_age_hours=9999)
            if cached_rt:
                return {**cached_rt, **info, "symbol": sym, "cached": True}
            return JSONResponse({"error": "Unable to load data", "cached": False}, status_code=502)

        result = {
            "symbol":       sym,
            "name":         info.get("name", sym),
            "price":        price_data.get("price"),
            "change":       price_data.get("change"),
            "change_pct":   price_data.get("change_pct"),
            "volume":       price_data.get("volume"),
            "market_cap":   info.get("market_cap"),
            "pe_ratio":     None,
            "week52_high":  week52_high,
            "week52_low":   week52_low,
            "sector":       info.get("sector", ""),
            "industry":     info.get("industry", ""),
            "description":  info.get("description", ""),
            "homepage_url": info.get("homepage_url", ""),
            "employees":    info.get("employees"),
        }
        return result

    except Exception:
        cached_rt = read_cache(f"{sym}_realtime", max_age_hours=9999)
        cached_info = read_cache(f"{sym}_info", max_age_hours=9999) or {}
        if cached_rt:
            return {
                "symbol":       sym,
                "name":         cached_info.get("name", sym),
                "price":        cached_rt.get("price"),
                "change":       cached_rt.get("change"),
                "change_pct":   cached_rt.get("change_pct"),
                "volume":       cached_rt.get("volume"),
                "market_cap":   cached_info.get("market_cap"),
                "pe_ratio":     None,
                "week52_high":  None,
                "week52_low":   None,
                "sector":       cached_info.get("sector", ""),
                "industry":     cached_info.get("industry", ""),
                "description":  cached_info.get("description", ""),
                "homepage_url": cached_info.get("homepage_url", ""),
                "employees":    cached_info.get("employees"),
                "cached":       True,
            }
        return JSONResponse({"error": "Unable to load data", "cached": False}, status_code=502)


@router.get("/search")
def search_us_stocks(q: str = Query(..., min_length=1)):
    q_strip  = q.strip()
    q_lower  = q_strip.lower()
    cache_key = f"search_{q_lower}"

    cached = read_cache(cache_key, max_age_hours=24)
    if cached:
        return cached

    # Fast local match first
    results = []
    seen = set()
    for t in POPULAR_TICKERS:
        if q_lower in t["code"].lower() or q_lower in t["name"].lower():
            if t["code"] not in seen:
                seen.add(t["code"])
                results.append({
                    "symbol":   t["code"],
                    "name":     t["name"],
                    "exchange": t.get("exchange", ""),
                    "sector":   t.get("sector", ""),
                    "type":     "CS",
                })
        if len(results) >= 10:
            break

    # Polygon search for anything not in popular list
    if not results:
        try:
            data = _polygon_get(
                "/v3/reference/tickers",
                {"search": q_strip, "market": "stocks", "active": "true", "limit": 10},
            )
            for item in data.get("results", []):
                if item.get("type") != "CS":
                    continue
                results.append({
                    "symbol":   item.get("ticker", ""),
                    "name":     item.get("name", ""),
                    "exchange": item.get("primary_exchange", ""),
                    "sector":   "",
                    "type":     "CS",
                })
                if len(results) >= 10:
                    break
        except Exception:
            pass

    write_cache(cache_key, results)
    return results


@router.get("/similar/{symbol}")
def get_us_similar(symbol: str):
    sym = symbol.upper()
    cache_key = f"{sym}_similar_us"

    cached = read_cache(cache_key, max_age_hours=24)
    if cached:
        return cached

    try:
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
            return {"symbol": sym, "industry": sector or "", "results": []}

        candidates = candidates[:15]

        def _get_series_and_sparkline(ticker_sym: str):
            """Return (date-indexed returns Series, sparkline list)."""
            try:
                all_c = _fetch_history_candles(ticker_sym, 365)
                recent = all_c[-252:] if len(all_c) > 252 else all_c
                valid = [(c["date"], c["close"]) for c in recent if c.get("date") and c.get("close")]
                sparkline = [c["close"] for c in all_c[-20:] if c.get("close")]
                if not valid:
                    return None, []
                dates, closes = zip(*valid)
                series = pd.Series(list(closes), index=pd.to_datetime(list(dates)), dtype=float).pct_change().dropna()
                return series, sparkline
            except Exception:
                return None, []

        ref_series, _ = _get_series_and_sparkline(sym)
        if ref_series is None or len(ref_series) < 20:
            return {"symbol": sym, "industry": sector or "", "results": []}

        results = []
        for peer in candidates:
            peer_series, sparkline = _get_series_and_sparkline(peer)
            if peer_series is None or len(peer_series) < 20:
                continue
            # Align by date — overlapping trading days only
            combined = pd.DataFrame({"ref": ref_series, "peer": peer_series}).dropna()
            if len(combined) < 20:
                continue
            corr = float(combined["ref"].corr(combined["peer"]))
            if np.isnan(corr):
                continue
            # Name lookup: POPULAR_TICKERS → fresh Polygon → stale cache → symbol code
            peer_name = next(
                (tk["name"] for tk in POPULAR_TICKERS if tk["code"] == peer), None
            )
            if not peer_name:
                try:
                    info = _fetch_company_info(peer)
                    peer_name = info.get("name") or None
                except Exception:
                    peer_name = None
            if not peer_name:
                stale_info = read_cache(f"{peer}_info", max_age_hours=9999) or {}
                peer_name = stale_info.get("name") or peer
            results.append({
                "code":        peer,
                "name":        peer_name,
                "correlation": round(corr, 4),
                "sparkline":   sparkline,
            })

        results.sort(key=lambda x: x["correlation"], reverse=True)
        results = results[:10]

        response = {"symbol": sym, "industry": sector or "", "results": results}
        write_cache(cache_key, response)
        return response

    except Exception:
        stale = read_cache(cache_key, max_age_hours=9999)
        if stale:
            return {**stale, "cached": True}
        return JSONResponse({"error": "Unable to load data", "cached": False}, status_code=502)


# ── Legacy endpoint (backward compat with useStockData / getUSStockHistory) ───

@router.get("/stock/{symbol}")
def get_us_stock(
    symbol: str,
    period: str = "daily",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    sym = symbol.upper()
    all_candles = _fetch_history_candles(sym, 365)

    start = _fmt_date(start_date) or (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    end   = _fmt_date(end_date)   or datetime.now().strftime("%Y-%m-%d")
    candles_raw = [c for c in all_candles if start <= c["date"] <= end]

    if not candles_raw:
        return JSONResponse({"error": f"No data found for {sym}", "cached": False}, status_code=404)

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
            "amount":     round(c["close"] * c["volume"], 2) if c["close"] and c["volume"] else None,
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

    info = {}
    try:
        info = _fetch_company_info(sym)
    except Exception:
        info = read_cache(f"{sym}_info", max_age_hours=9999) or {}

    return {
        "symbol": sym,
        "name":   info.get("name", sym),
        "candles": candles,
        "ma":      ma_data,
        "macd":    macd_data,
        "rsi":     rsi_data,
    }

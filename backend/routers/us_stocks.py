"""
US Stock router — /api/us/*

Endpoints:
  GET /search?q={query}               Search by ticker or company name
  GET /stock/{symbol}                 Historical OHLCV + indicators (legacy, used by useStockData)
  GET /stock/{symbol}/realtime        Real-time quote  (5-min cache)
  GET /stock/{symbol}/history         Historical OHLCV (1-hr cache, spec-style params)
  GET /similar/{symbol}               Top-10 peers by Pearson correlation (2-hr cache)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import time

router = APIRouter()

# ── Industry map ──────────────────────────────────────────────────────────────
_INDUSTRY_MAP: dict = {}
_INDUSTRY_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "us_industry_map.json")

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

# ── Caches ────────────────────────────────────────────────────────────────────
_rt_cache:   dict = {}   # realtime   5 min
_hist_cache: dict = {}   # history    60 min
_sim_cache:  dict = {}   # similar    120 min

_RT_TTL   = 300
_HIST_TTL = 3600
_SIM_TTL  = 7200


# ── Popular tickers for fast search ──────────────────────────────────────────
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


# ── Utilities ─────────────────────────────────────────────────────────────────

def _safe(v):
    try:
        f = float(v)
        return None if (pd.isna(f) or not np.isfinite(f)) else round(f, 4)
    except Exception:
        return None


def _compute_ma(closes):
    return {f'ma{w}': closes.rolling(w).mean() for w in [5, 10, 20, 60]}


def _compute_macd(closes):
    ema12 = closes.ewm(span=12, adjust=False).mean()
    ema26 = closes.ewm(span=26, adjust=False).mean()
    dif = ema12 - ema26
    dea = dif.ewm(span=9, adjust=False).mean()
    return dif, dea, (dif - dea) * 2


def _compute_rsi(closes):
    result = {}
    for p in [6, 12, 24]:
        delta = closes.diff()
        avg_gain = delta.clip(lower=0).ewm(alpha=1/p, adjust=False).mean()
        avg_loss = (-delta.clip(upper=0)).ewm(alpha=1/p, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, float('nan'))
        result[f'rsi{p}'] = 100 - (100 / (1 + rs))
    return result


def _fmt_date(d):
    if d and len(d) == 8 and '-' not in d:
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    return d


def _find_sector(symbol: str) -> Optional[str]:
    sym = symbol.upper()
    for sector, tickers in _INDUSTRY_MAP.items():
        if sym in tickers:
            return sector
    for t in POPULAR_TICKERS:
        if t["code"] == sym:
            return t.get("sector")
    return None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/search")
def search_us_stocks(q: str = Query(..., min_length=1)):
    """Search by ticker symbol or company name. Fast local match + yfinance fallback."""
    q_lower = q.strip().lower()
    results = []
    seen = set()

    for t in POPULAR_TICKERS:
        if q_lower in t['code'].lower() or q_lower in t['name'].lower():
            if t['code'] not in seen:
                seen.add(t['code'])
                results.append({
                    "code": t['code'],
                    "name": t['name'],
                    "exchange": t.get("exchange", ""),
                    "sector": t.get("sector", ""),
                })
        if len(results) >= 15:
            break

    # yfinance fallback for exact symbol lookup
    if not results:
        try:
            sym = q.strip().upper()
            info = yf.Ticker(sym).info
            name = info.get('shortName') or info.get('longName')
            if name:
                results.append({
                    "code": sym,
                    "name": name,
                    "exchange": info.get("exchange", ""),
                    "sector": info.get("sector", ""),
                })
        except Exception:
            pass

    return results


@router.get("/stock/{symbol}/realtime")
def get_us_realtime(symbol: str):
    """Real-time US stock quote. Cached 5 minutes."""
    sym = symbol.upper()
    now = time.time()
    if sym in _rt_cache:
        ts, data = _rt_cache[sym]
        if now - ts < _RT_TTL:
            return data

    try:
        ticker = yf.Ticker(sym)
        info = ticker.info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not info:
        raise HTTPException(status_code=404, detail=f"No data for {sym}")

    def _f(key):
        v = info.get(key)
        return _safe(v) if v is not None else None

    result = {
        "symbol": sym,
        "name": info.get("shortName") or info.get("longName") or sym,
        "price": _f("currentPrice") or _f("regularMarketPrice") or _f("previousClose"),
        "change": _f("regularMarketChange"),
        "change_pct": _f("regularMarketChangePercent"),
        "volume": info.get("regularMarketVolume"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": _f("trailingPE"),
        "week52_high": _f("fiftyTwoWeekHigh"),
        "week52_low": _f("fiftyTwoWeekLow"),
        "sector": info.get("sector", ""),
        "industry": info.get("industry", ""),
        "exchange": info.get("exchange", ""),
    }
    _rt_cache[sym] = (now, result)
    return result


@router.get("/stock/{symbol}/history")
def get_us_history(
    symbol: str,
    period: str = "1y",
    interval: str = "1d",
):
    """Historical OHLCV data. Cached 1 hour."""
    sym = symbol.upper()
    cache_key = f"{sym}_{period}_{interval}"
    now = time.time()
    if cache_key in _hist_cache:
        ts, data = _hist_cache[cache_key]
        if now - ts < _HIST_TTL:
            return data

    try:
        ticker = yf.Ticker(sym)
        df = ticker.history(period=period, interval=interval, auto_adjust=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {sym}")

    df.index = pd.to_datetime(df.index)
    df = df.sort_index()
    closes = df["Close"]
    pct = closes.pct_change() * 100

    candles = [
        {
            "date": idx.strftime("%Y-%m-%d"),
            "open": _safe(row["Open"]),
            "high": _safe(row["High"]),
            "low": _safe(row["Low"]),
            "close": _safe(row["Close"]),
            "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
            "pct_change": _safe(pct.iloc[i]),
        }
        for i, (idx, row) in enumerate(df.iterrows())
    ]

    result = {"symbol": sym, "candles": candles}
    _hist_cache[cache_key] = (now, result)
    return result


@router.get("/similar/{symbol}")
def get_us_similar(symbol: str):
    """Top-10 peers by Pearson correlation on last-year daily returns. Cached 2 hours."""
    sym = symbol.upper()
    now = time.time()
    if sym in _sim_cache:
        ts, data = _sim_cache[sym]
        if now - ts < _SIM_TTL:
            return data

    _load_industry_map()
    sector = _find_sector(sym)

    # Get candidate peers
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

    candidates = candidates[:30]

    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=365)

    def _fetch_returns(ticker_sym: str):
        try:
            t = yf.Ticker(ticker_sym)
            df = t.history(start=start_dt, end=end_dt, interval="1d", auto_adjust=True)
            if df is None or df.empty or len(df) < 20:
                return None, []
            closes = df["Close"]
            sparkline = [round(float(v), 2) for v in closes.dropna().tolist()[-20:]]
            return closes.pct_change().dropna(), sparkline
        except Exception:
            return None, []

    ref_ret, _ = _fetch_returns(sym)
    if ref_ret is None:
        raise HTTPException(status_code=500, detail=f"Cannot fetch data for {sym}")

    results = []
    for peer in candidates:
        peer_ret, sparkline = _fetch_returns(peer)
        if peer_ret is None:
            continue
        combined = pd.concat([ref_ret, peer_ret], axis=1, join="inner")
        combined.columns = ["ref", "peer"]
        combined = combined.dropna()
        if len(combined) < 20:
            continue
        corr = float(combined["ref"].corr(combined["peer"]))
        if np.isnan(corr):
            continue

        peer_name = next((tk["name"] for tk in POPULAR_TICKERS if tk["code"] == peer), peer)

        results.append({
            "code": peer,
            "name": peer_name,
            "correlation": round(corr, 4),
            "sparkline": sparkline,
            "sector": sector or "",
        })

    results.sort(key=lambda x: x["correlation"], reverse=True)
    results = results[:10]

    response = {
        "symbol": sym,
        "sector": sector or "",
        "results": results,
    }
    _sim_cache[sym] = (now, response)
    return response


# ── Legacy endpoint (backward compat with useStockData hook) ──────────────────

@router.get("/stock/{symbol}")
def get_us_stock(
    symbol: str,
    period: str = "daily",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    interval = {"daily": "1d", "weekly": "1wk", "monthly": "1mo"}.get(period, "1d")
    start = _fmt_date(start_date) or (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    end = _fmt_date(end_date) or datetime.now().strftime("%Y-%m-%d")

    try:
        ticker = yf.Ticker(symbol.upper())
        df = ticker.history(start=start, end=end, interval=interval, auto_adjust=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    df.index = pd.to_datetime(df.index)
    df = df.sort_index()

    closes = df['Close']
    ma = _compute_ma(closes)
    dif, dea, macd_hist = _compute_macd(closes)
    rsi = _compute_rsi(closes)
    pct = closes.pct_change() * 100

    dates = [idx.strftime("%Y-%m-%d") for idx in df.index]

    candles = [
        {
            "date": dates[i],
            "open": _safe(row['Open']),
            "high": _safe(row['High']),
            "low": _safe(row['Low']),
            "close": _safe(row['Close']),
            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0,
            "amount": _safe(row['Close'] * row['Volume']),
            "pct_change": _safe(pct.iloc[i]),
            "turnover": 0,
        }
        for i, (_, row) in enumerate(df.iterrows())
    ]

    ma_data = [
        {
            "date": d,
            "ma5":  _safe(ma['ma5'].iloc[i]),
            "ma10": _safe(ma['ma10'].iloc[i]),
            "ma20": _safe(ma['ma20'].iloc[i]),
            "ma60": _safe(ma['ma60'].iloc[i]),
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
            "date": d,
            "rsi6":  _safe(rsi['rsi6'].iloc[i]),
            "rsi12": _safe(rsi['rsi12'].iloc[i]),
            "rsi24": _safe(rsi['rsi24'].iloc[i]),
        }
        for i, d in enumerate(dates)
    ]

    try:
        info = ticker.info
        name = info.get('shortName') or info.get('longName') or symbol.upper()
    except Exception:
        name = symbol.upper()

    return {
        "symbol": symbol.upper(),
        "name": name,
        "candles": candles,
        "ma": ma_data,
        "macd": macd_data,
        "rsi": rsi_data,
    }

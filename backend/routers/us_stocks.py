from fastapi import APIRouter, HTTPException
from typing import Optional
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

router = APIRouter()

POPULAR_TICKERS = [
    # Tech
    {"code": "AAPL",  "name": "Apple Inc."},
    {"code": "MSFT",  "name": "Microsoft Corp."},
    {"code": "NVDA",  "name": "NVIDIA Corp."},
    {"code": "GOOGL", "name": "Alphabet Inc."},
    {"code": "AMZN",  "name": "Amazon.com Inc."},
    {"code": "META",  "name": "Meta Platforms Inc."},
    {"code": "TSLA",  "name": "Tesla Inc."},
    {"code": "AVGO",  "name": "Broadcom Inc."},
    {"code": "ORCL",  "name": "Oracle Corp."},
    {"code": "CRM",   "name": "Salesforce Inc."},
    {"code": "AMD",   "name": "Advanced Micro Devices"},
    {"code": "INTC",  "name": "Intel Corp."},
    {"code": "QCOM",  "name": "Qualcomm Inc."},
    {"code": "ADBE",  "name": "Adobe Inc."},
    {"code": "NFLX",  "name": "Netflix Inc."},
    {"code": "MU",    "name": "Micron Technology"},
    {"code": "NOW",   "name": "ServiceNow Inc."},
    {"code": "SNOW",  "name": "Snowflake Inc."},
    {"code": "PLTR",  "name": "Palantir Technologies"},
    {"code": "AMAT",  "name": "Applied Materials Inc."},
    # Finance
    {"code": "JPM",   "name": "JPMorgan Chase & Co."},
    {"code": "BAC",   "name": "Bank of America Corp."},
    {"code": "WFC",   "name": "Wells Fargo & Co."},
    {"code": "GS",    "name": "Goldman Sachs Group"},
    {"code": "MS",    "name": "Morgan Stanley"},
    {"code": "V",     "name": "Visa Inc."},
    {"code": "MA",    "name": "Mastercard Inc."},
    {"code": "PYPL",  "name": "PayPal Holdings Inc."},
    {"code": "BRK-B", "name": "Berkshire Hathaway B"},
    # Healthcare
    {"code": "JNJ",   "name": "Johnson & Johnson"},
    {"code": "UNH",   "name": "UnitedHealth Group"},
    {"code": "LLY",   "name": "Eli Lilly and Co."},
    {"code": "PFE",   "name": "Pfizer Inc."},
    {"code": "ABBV",  "name": "AbbVie Inc."},
    {"code": "MRK",   "name": "Merck & Co. Inc."},
    {"code": "TMO",   "name": "Thermo Fisher Scientific"},
    # Consumer
    {"code": "WMT",   "name": "Walmart Inc."},
    {"code": "COST",  "name": "Costco Wholesale Corp."},
    {"code": "HD",    "name": "Home Depot Inc."},
    {"code": "MCD",   "name": "McDonald's Corp."},
    {"code": "SBUX",  "name": "Starbucks Corp."},
    {"code": "NKE",   "name": "Nike Inc."},
    {"code": "KO",    "name": "Coca-Cola Co."},
    {"code": "PEP",   "name": "PepsiCo Inc."},
    {"code": "PG",    "name": "Procter & Gamble Co."},
    # Energy
    {"code": "XOM",   "name": "Exxon Mobil Corp."},
    {"code": "CVX",   "name": "Chevron Corp."},
    # ETFs / Indices
    {"code": "SPY",   "name": "SPDR S&P 500 ETF"},
    {"code": "QQQ",   "name": "Invesco QQQ Trust"},
    {"code": "DIA",   "name": "SPDR Dow Jones ETF"},
    {"code": "IWM",   "name": "iShares Russell 2000 ETF"},
    {"code": "GLD",   "name": "SPDR Gold Trust"},
    {"code": "TLT",   "name": "iShares 20+ Year Treasury ETF"},
]


def _safe(v):
    try:
        f = float(v)
        return None if (pd.isna(f) or not np.isfinite(f)) else round(f, 4)
    except Exception:
        return None


def _compute_ma(closes):
    return {
        f'ma{w}': closes.rolling(w).mean()
        for w in [5, 10, 20, 60]
    }


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
    """Convert YYYYMMDD → YYYY-MM-DD if needed."""
    if d and len(d) == 8 and '-' not in d:
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    return d


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


@router.get("/search/{query}")
def search_us_stocks(query: str):
    q_lower = query.strip().lower()
    results = []

    for t in POPULAR_TICKERS:
        if q_lower in t['code'].lower() or q_lower in t['name'].lower():
            results.append({"code": t['code'], "name": t['name']})
        if len(results) >= 15:
            break

    # If no static hits, try yfinance direct lookup
    if not results:
        try:
            sym = query.strip().upper()
            info = yf.Ticker(sym).info
            name = info.get('shortName') or info.get('longName')
            if name:
                results.append({"code": sym, "name": name})
        except Exception:
            pass

    return results

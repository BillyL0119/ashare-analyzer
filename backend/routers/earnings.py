"""
Earnings Calendar — /api/earnings/calendar
Returns upcoming US and A-share earnings in the next 30 days.
Cache TTL: 1 hour.
"""
from fastapi import APIRouter
import time
import logging
from datetime import date, datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter()
logger = logging.getLogger("earnings")

_CACHE_TTL = 3600  # 1 hour
_cache_ts: float = 0
_cache_data: dict | None = None

# Major US tickers to track
_US_TICKERS = [
    ("AAPL", "Apple"),
    ("MSFT", "Microsoft"),
    ("NVDA", "NVIDIA"),
    ("GOOGL", "Alphabet"),
    ("META", "Meta"),
    ("AMZN", "Amazon"),
    ("TSLA", "Tesla"),
    ("JPM", "JPMorgan"),
    ("V", "Visa"),
    ("MA", "Mastercard"),
    ("NFLX", "Netflix"),
    ("AMD", "AMD"),
    ("INTC", "Intel"),
    ("CRM", "Salesforce"),
    ("ADBE", "Adobe"),
    ("WMT", "Walmart"),
    ("COST", "Costco"),
    ("HD", "Home Depot"),
    ("BAC", "Bank of America"),
    ("GS", "Goldman Sachs"),
    ("XOM", "ExxonMobil"),
    ("PYPL", "PayPal"),
    ("ORCL", "Oracle"),
    ("QCOM", "Qualcomm"),
    ("TXN", "Texas Instruments"),
    ("MU", "Micron"),
    ("AMAT", "Applied Materials"),
]


def _today() -> date:
    return datetime.now().date()


def _in_window(d: date) -> bool:
    today = _today()
    return today <= d <= today + timedelta(days=30)


def _fmt_revenue(val) -> str | None:
    try:
        v = float(val)
        if v != v:  # NaN
            return None
        if v >= 1e12:
            return f"${v / 1e12:.2f}T"
        if v >= 1e9:
            return f"${v / 1e9:.1f}B"
        if v >= 1e6:
            return f"${v / 1e6:.0f}M"
        return f"${v:.0f}"
    except Exception:
        return None


def _fmt_eps(val) -> str | None:
    try:
        v = float(val)
        if v != v:
            return None
        return f"{v:.2f}"
    except Exception:
        return None


def _fetch_one_us(sym: str, name: str) -> dict | None:
    try:
        import yfinance as yf
        t = yf.Ticker(sym)
        cal = t.calendar
        if not cal:
            return None
        # yfinance ≥0.2: calendar is a dict
        earn_dates = cal.get("Earnings Date", [])
        if not earn_dates:
            return None
        if not isinstance(earn_dates, (list, tuple)):
            earn_dates = [earn_dates]
        earn_date = earn_dates[0]
        if hasattr(earn_date, "date"):
            earn_date = earn_date.date()
        elif isinstance(earn_date, str):
            earn_date = datetime.strptime(earn_date[:10], "%Y-%m-%d").date()
        else:
            return None
        if not _in_window(earn_date):
            return None
        return {
            "date": earn_date.isoformat(),
            "symbol": sym,
            "name": name,
            "market": "us",
            "eps_estimate": _fmt_eps(cal.get("EPS Estimate")),
            "eps_actual": _fmt_eps(cal.get("EPS Actual")),
            "revenue_estimate": _fmt_revenue(cal.get("Revenue Estimate")),
            "revenue_actual": _fmt_revenue(cal.get("Revenue Actual")),
            "timing": None,
        }
    except Exception as e:
        logger.debug("yfinance %s: %s", sym, e)
        return None


_NASDAQ_HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
_MIN_CAP = 20e9      # only companies worth following (>= $20B market cap)
_PER_DAY = 12


def _money(txt) -> float:
    try:
        return float(str(txt).replace("$", "").replace(",", ""))
    except Exception:
        return 0.0


def _nasdaq_day(d: date) -> list:
    import requests
    try:
        r = requests.get("https://api.nasdaq.com/api/calendar/earnings",
                         params={"date": d.isoformat()}, headers=_NASDAQ_HEADERS, timeout=10)
        rows = (r.json().get("data") or {}).get("rows") or []
    except Exception as e:
        logger.warning("nasdaq earnings %s: %s", d, e)
        return []
    out = []
    for row in rows:
        cap = _money(row.get("marketCap"))
        if cap < _MIN_CAP:
            continue
        t = row.get("time") or ""
        out.append({
            "date": d.isoformat(),
            "symbol": row.get("symbol"),
            "name": row.get("name"),
            "market": "us",
            "eps_estimate": _fmt_eps(_money(row.get("epsForecast")) if row.get("epsForecast") else None),
            "eps_actual": None,
            "revenue_estimate": None,
            "revenue_actual": None,
            "timing": "BMO" if "pre" in t else "AMC" if "after" in t else None,
            "market_cap": cap,
        })
    out.sort(key=lambda e: -e["market_cap"])
    return out[:_PER_DAY]


def _fetch_us_earnings() -> list:
    """Nasdaq's public earnings calendar (Yahoo rate-limits the server), yfinance as a fallback."""
    days = [_today() + timedelta(days=i) for i in range(0, 21)]
    days = [d for d in days if d.weekday() < 5]
    events = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for rows in pool.map(_nasdaq_day, days):
            events.extend(rows)
    if events:
        events.sort(key=lambda e: (e["date"], -e["market_cap"]))
        return events

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(_fetch_one_us, sym, name): sym for sym, name in _US_TICKERS}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                events.append(result)
    events.sort(key=lambda e: e["date"])
    return events


def _get_report_period() -> str:
    """Return the AkShare period string for the most relevant upcoming quarter."""
    today = _today()
    # Quarter-end dates
    quarters = [
        (date(today.year, 3, 31), "一季报"),
        (date(today.year, 6, 30), "中报"),
        (date(today.year, 9, 30), "三季报"),
        (date(today.year, 12, 31), "年报"),
        (date(today.year + 1, 3, 31), "一季报"),
    ]
    # Pick the next quarter whose reporting season hasn't fully closed
    # (typically starts ~1 month after quarter-end)
    for qdate, period in quarters:
        if today <= qdate + timedelta(days=60):
            return period
    return "年报"


_csi300: tuple = (0.0, set())


def _csi300_codes() -> set:
    """CSI 300 constituents (cached 24h): the A-share names worth listing."""
    global _csi300
    ts, codes = _csi300
    if codes and time.time() - ts < 86400:
        return codes
    try:
        import akshare as ak
        df = ak.index_stock_cons_csindex(symbol="000300")
        codes = {str(c).zfill(6) for c in df["成分券代码"]}
        _csi300 = (time.time(), codes)
    except Exception as e:
        logger.warning("csi300 list failed: %s", e)
    return codes


def _disclosure_date(row):
    """Latest scheduled date: the last change, else the first appointment."""
    import pandas as pd
    for col in ("三次变更", "二次变更", "初次变更", "首次预约"):
        v = row.get(col)
        if v is not None and not pd.isna(v):
            return pd.Timestamp(v).date()
    return None


def _fetch_ashare_earnings() -> list:
    """A-share disclosure schedule (akshare period names are year-prefixed, e.g. '2026三季')."""
    events = []
    try:
        import akshare as ak
        y = _today().year
        keep = _csi300_codes()
        seen = set()
        for period in (f"{y}三季", f"{y}半年报", f"{y}一季", f"{y - 1}年报"):
            try:
                df = ak.stock_report_disclosure(market="沪深京", period=period)
            except Exception as e:
                logger.debug("A-share %s: %s", period, e)
                continue
            if df is None or df.empty:
                continue
            for _, row in df.iterrows():
                try:
                    d = _disclosure_date(row)
                    if d is None or not _in_window(d):
                        continue
                    code = str(row["股票代码"]).zfill(6)
                    if code in seen or (keep and code not in keep):
                        continue
                    seen.add(code)
                    events.append({
                        "date": d.isoformat(),
                        "symbol": code,
                        "name": str(row["股票简称"]).replace(" ", ""),
                        "market": "cn",
                        "eps_estimate": None,
                        "eps_actual": None,
                        "revenue_estimate": None,
                        "revenue_actual": None,
                        "timing": period[4:] if period[:4].isdigit() else period,
                    })
                except Exception:
                    continue
    except Exception as e:
        logger.warning("A-share earnings fetch failed: %s", e)
    events.sort(key=lambda e: (e["date"], e["symbol"]))
    return events


@router.get("/calendar")
def earnings_calendar():
    global _cache_ts, _cache_data
    now = time.time()
    if _cache_data is not None and now - _cache_ts < _CACHE_TTL:
        return _cache_data

    us_events = _fetch_us_earnings()
    cn_events = _fetch_ashare_earnings()

    result = {
        "us": us_events,
        "cn": cn_events,
        "updated_at": datetime.now().isoformat(),
    }
    if us_events:
        _cache_ts = now
        _cache_data = result
    return result


def _warm_loop():
    """Keep the calendar hot: first request after a restart used to take ~13s."""
    global _cache_ts
    while True:
        try:
            _cache_ts = 0          # force a rebuild
            earnings_calendar()
        except Exception as e:
            logger.warning("earnings warm-up failed: %s", e)
        time.sleep(_CACHE_TTL - 300)


import threading as _threading
_threading.Thread(target=_warm_loop, daemon=True, name="earnings-warm").start()

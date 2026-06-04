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


def _fetch_us_earnings() -> list:
    events = []
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


def _fetch_ashare_earnings() -> list:
    events = []
    try:
        import akshare as ak
        period = _get_report_period()
        for period_try in [period, "一季报", "中报", "三季报", "年报"]:
            try:
                df = ak.stock_report_disclosure(market="沪深A股", period=period_try)
                if df is None or df.empty:
                    continue
                # Identify columns
                date_col = next(
                    (c for c in df.columns if any(k in c for k in ["披露", "公告", "日期", "date"])),
                    None,
                )
                code_col = next(
                    (c for c in df.columns if any(k in c for k in ["代码", "code"])),
                    None,
                )
                name_col = next(
                    (c for c in df.columns if any(k in c for k in ["名称", "name"])),
                    None,
                )
                if date_col is None or code_col is None:
                    logger.debug("A-share %s: unexpected cols %s", period_try, list(df.columns))
                    continue

                seen = set()
                for _, row in df.iterrows():
                    try:
                        raw = str(row[date_col])
                        if not raw or raw in ("nan", "None", ""):
                            continue
                        d = datetime.strptime(raw[:10], "%Y-%m-%d").date()
                        if not _in_window(d):
                            continue
                        code = str(row[code_col]).zfill(6)
                        if code in seen:
                            continue
                        seen.add(code)
                        name = str(row[name_col]) if name_col else code
                        events.append({
                            "date": d.isoformat(),
                            "symbol": code,
                            "name": name,
                            "market": "cn",
                            "eps_estimate": None,
                            "eps_actual": None,
                            "revenue_estimate": None,
                            "revenue_actual": None,
                            "timing": period_try,
                        })
                    except Exception:
                        continue
                if events:
                    break  # got data from this period
            except Exception as e:
                logger.debug("A-share %s: %s", period_try, e)
                continue
    except Exception as e:
        logger.warning("A-share earnings fetch failed: %s", e)
    events.sort(key=lambda e: e["date"])
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
    _cache_ts = now
    _cache_data = result
    return result

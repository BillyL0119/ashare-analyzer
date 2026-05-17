"""
A-Share Calendar — /api/calendar/events

Returns upcoming A-share events in the next 30 days:
earnings disclosures, dividends, new stock IPOs, and public holidays.
All data sources wrapped in try/except; failures return empty lists.
"""

from fastapi import APIRouter
import akshare as ak
import os
import json
import time
import logging
from datetime import date, datetime, timedelta

router = APIRouter()
logger = logging.getLogger("calendar")

_CACHE_TTL = 1800  # 30 minutes
_cache_ts: float = 0
_cache_data: dict | None = None

_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
try:
    with open(_MAP_PATH, "r", encoding="utf-8") as _f:
        _INDUSTRY_MAP: dict = json.load(_f)
except Exception:
    _INDUSTRY_MAP = {"industries": {}}

_NAMES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "stock_names.json")
try:
    with open(_NAMES_PATH, "r", encoding="utf-8") as _f:
        _STOCK_NAMES: dict = json.load(_f)
except Exception:
    _STOCK_NAMES = {}

# Chinese public holidays (fixed + common lunar holidays for 2026)
_HOLIDAYS_2026 = [
    ("2026-01-01", "元旦", "New Year's Day"),
    ("2026-01-28", "春节", "Spring Festival"),
    ("2026-01-29", "春节", "Spring Festival"),
    ("2026-01-30", "春节", "Spring Festival"),
    ("2026-01-31", "春节", "Spring Festival"),
    ("2026-02-01", "春节", "Spring Festival"),
    ("2026-02-02", "春节", "Spring Festival"),
    ("2026-02-03", "春节", "Spring Festival"),
    ("2026-04-05", "清明节", "Qingming Festival"),
    ("2026-04-06", "清明节", "Qingming Festival"),
    ("2026-04-07", "清明节", "Qingming Festival"),
    ("2026-05-01", "劳动节", "Labour Day"),
    ("2026-05-02", "劳动节", "Labour Day"),
    ("2026-05-03", "劳动节", "Labour Day"),
    ("2026-05-04", "劳动节", "Labour Day"),
    ("2026-05-05", "劳动节", "Labour Day"),
    ("2026-06-19", "端午节", "Dragon Boat Festival"),
    ("2026-06-20", "端午节", "Dragon Boat Festival"),
    ("2026-06-21", "端午节", "Dragon Boat Festival"),
    ("2026-10-01", "国庆节", "National Day"),
    ("2026-10-02", "国庆节", "National Day"),
    ("2026-10-03", "国庆节", "National Day"),
    ("2026-10-04", "国庆节", "National Day"),
    ("2026-10-05", "国庆节", "National Day"),
    ("2026-10-06", "国庆节", "National Day"),
    ("2026-10-07", "国庆节", "National Day"),
    ("2026-10-08", "国庆节", "National Day"),
]


def _today() -> date:
    return datetime.now().date()


def _in_window(d: date) -> bool:
    today = _today()
    return today <= d <= today + timedelta(days=30)


def _get_name(symbol: str) -> str:
    return _STOCK_NAMES.get(symbol, symbol)


def _fetch_earnings() -> list:
    """Fetch upcoming earnings disclosure dates via stock_report_disclosure."""
    events = []
    try:
        # market: 沪深A股
        df = ak.stock_report_disclosure(market="沪深A股", period="一季报")
        if df is None or df.empty:
            return events
        # Columns vary by akshare version; find date column
        date_col = None
        for c in df.columns:
            if "日期" in c or "披露" in c or "date" in c.lower():
                date_col = c
                break
        code_col = None
        for c in df.columns:
            if "代码" in c or "code" in c.lower() or "股票代码" in c:
                code_col = c
                break
        if date_col is None or code_col is None:
            logger.warning("earnings: unexpected columns %s", list(df.columns))
            return events

        for _, row in df.iterrows():
            try:
                d = datetime.strptime(str(row[date_col])[:10], "%Y-%m-%d").date()
                if not _in_window(d):
                    continue
                code = str(row[code_col]).zfill(6)
                events.append({
                    "date": d.isoformat(),
                    "type": "earnings",
                    "symbol": code,
                    "name": _get_name(code),
                    "title": "财报披露",
                    "title_en": "Earnings Disclosure",
                })
            except Exception:
                continue
    except Exception as e:
        logger.warning("earnings fetch failed: %s", e)
    return events


def _fetch_dividends() -> list:
    """Fetch upcoming ex-dividend dates."""
    events = []
    try:
        df = ak.stock_dividend_cninfo(symbol="A股")
        if df is None or df.empty:
            return events
        # Find ex-date column
        date_col = None
        for c in df.columns:
            if "除权" in c or "除息" in c or "ex" in c.lower():
                date_col = c
                break
        if date_col is None:
            # Try any date-like column
            for c in df.columns:
                if "日期" in c:
                    date_col = c
                    break
        code_col = None
        for c in df.columns:
            if "代码" in c or "股票代码" in c:
                code_col = c
                break
        if date_col is None or code_col is None:
            logger.warning("dividends: unexpected columns %s", list(df.columns))
            return events

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
                key = (d, code)
                if key in seen:
                    continue
                seen.add(key)
                events.append({
                    "date": d.isoformat(),
                    "type": "dividend",
                    "symbol": code,
                    "name": _get_name(code),
                    "title": "分红除权",
                    "title_en": "Ex-Dividend Date",
                })
            except Exception:
                continue
    except Exception as e:
        logger.warning("dividends fetch failed: %s", e)
    return events


def _fetch_ipos() -> list:
    """Fetch upcoming new stock listings."""
    events = []
    try:
        df = ak.stock_zh_a_new_em()
        if df is None or df.empty:
            return events
        # Find date column
        date_col = None
        for c in df.columns:
            if "上市" in c or "申购" in c or "日期" in c:
                date_col = c
                break
        code_col = None
        for c in df.columns:
            if "代码" in c or "股票代码" in c:
                code_col = c
                break
        name_col = None
        for c in df.columns:
            if "名称" in c or "股票名称" in c:
                name_col = c
                break
        if date_col is None or code_col is None:
            logger.warning("IPO: unexpected columns %s", list(df.columns))
            return events

        for _, row in df.iterrows():
            try:
                raw = str(row[date_col])
                if not raw or raw in ("nan", "None", ""):
                    continue
                d = datetime.strptime(raw[:10], "%Y-%m-%d").date()
                if not _in_window(d):
                    continue
                code = str(row[code_col]).zfill(6)
                name = str(row[name_col]) if name_col else _get_name(code)
                events.append({
                    "date": d.isoformat(),
                    "type": "ipo",
                    "symbol": code,
                    "name": name,
                    "title": "新股上市",
                    "title_en": "IPO Listing",
                })
            except Exception:
                continue
    except Exception as e:
        logger.warning("IPO fetch failed: %s", e)
    return events


def _fetch_holidays() -> list:
    """Return known public holidays within the 30-day window."""
    events = []
    for date_str, title_zh, title_en in _HOLIDAYS_2026:
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            if _in_window(d):
                events.append({
                    "date": date_str,
                    "type": "holiday",
                    "symbol": "",
                    "name": "",
                    "title": title_zh,
                    "title_en": title_en,
                })
        except Exception:
            continue
    return events


@router.get("/events")
def calendar_events():
    global _cache_ts, _cache_data

    now = time.time()
    if _cache_data is not None and now - _cache_ts < _CACHE_TTL:
        return _cache_data

    all_events: list = []
    all_events.extend(_fetch_holidays())
    all_events.extend(_fetch_earnings())
    all_events.extend(_fetch_dividends())
    all_events.extend(_fetch_ipos())

    # Sort by date, then type priority
    _type_order = {"holiday": 0, "earnings": 1, "dividend": 2, "ipo": 3}
    all_events.sort(key=lambda e: (e["date"], _type_order.get(e["type"], 9)))

    result = {"events": all_events}
    _cache_ts = now
    _cache_data = result
    return result

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

_CACHE_TTL = 6 * 3600
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
# Mainland public holidays (State Council notice 国办发明电〔2025〕7号). 2027 is published each
# November; add it then.
_HOLIDAY_RANGES = [
    ("2026-01-01", "2026-01-03", "元旦", "New Year's Day"),
    ("2026-02-15", "2026-02-23", "春节", "Spring Festival"),
    ("2026-04-04", "2026-04-06", "清明节", "Qingming Festival"),
    ("2026-05-01", "2026-05-05", "劳动节", "Labour Day"),
    ("2026-06-19", "2026-06-21", "端午节", "Dragon Boat Festival"),
    ("2026-09-25", "2026-09-27", "中秋节", "Mid-Autumn Festival"),
    ("2026-10-01", "2026-10-07", "国庆节", "National Day"),
]
_HOLIDAYS_2026 = [
    ((datetime.strptime(a, "%Y-%m-%d") + timedelta(days=i)).strftime("%Y-%m-%d"), zh, en)
    for a, b, zh, en in _HOLIDAY_RANGES
    for i in range((datetime.strptime(b, "%Y-%m-%d") - datetime.strptime(a, "%Y-%m-%d")).days + 1)
]


def _today() -> date:
    return datetime.now().date()


def _in_window(d: date) -> bool:
    today = _today()
    return today <= d <= today + timedelta(days=30)


def _get_name(symbol: str) -> str:
    return _STOCK_NAMES.get(symbol, symbol)


def _report_period(today: date) -> str:
    """The report season whose disclosure dates fall in the next 30 days (cninfo naming, e.g. 2026三季)."""
    y, m = today.year, today.month
    if m <= 4:
        return f"{y - 1}年报" if m <= 3 else f"{y}一季"
    if m <= 8:
        return f"{y}半年报"
    return f"{y}三季"


def _cell_date(v):
    raw = str(v)[:10]
    if not raw or raw in ("nan", "None", "NaT"):
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def _fetch_earnings() -> list:
    """Scheduled report disclosure dates (cninfo). The latest rescheduled date wins."""
    events = []
    try:
        with _cninfo_lock:
            df = ak.stock_report_disclosure(market="沪深京", period=_report_period(_today()))
        if df is None or df.empty:
            return events
        order = [c for c in ("实际披露", "三次变更", "二次变更", "初次变更", "首次预约") if c in df.columns]
        notable = {c for codes in (_INDUSTRY_MAP.get("industries") or {}).values() for c in codes}
        for _, row in df.iterrows():
            d = next((x for x in (_cell_date(row[c]) for c in order) if x), None)
            if not d or not _in_window(d):
                continue
            code = str(row.get("股票代码", "")).zfill(6)
            if code not in notable:          # ~5,000 companies report each season; list the followed ones
                continue
            events.append({
                "date": d.isoformat(), "type": "earnings", "symbol": code,
                "name": str(row.get("股票简称") or _get_name(code)),
                "title": "财报披露", "title_en": "Earnings Disclosure",
            })
    except Exception as e:
        logger.warning("earnings fetch failed: %s", e)
    return events


from services.js_runtime import V8_LOCK as _cninfo_lock   # shared with the 10jqka sector calls


def _dividend_watchlist() -> list[str]:
    """Large, widely followed names: the first few of every industry in industry_map."""
    out = []
    for codes in (_INDUSTRY_MAP.get("industries") or {}).values():
        for c in codes[:4]:
            if c not in out:
                out.append(c)
    return out[:60]


def _dividends_for(code: str) -> list:
    try:
        with _cninfo_lock:          # per stock, so other V8 users wait at most ~1s
            df = ak.stock_dividend_cninfo(symbol=code)
    except Exception:
        return []
    events = []
    for _, row in (df if df is not None else []).iterrows():
        d = _cell_date(row.get("除权日"))
        if not d or not _in_window(d):
            continue
        ratio = row.get("派息比例")
        detail = f"每10股派{ratio}元" if ratio not in (None, "") and str(ratio) != "nan" else ""
        events.append({
            "date": d.isoformat(), "type": "dividend", "symbol": code, "name": _get_name(code),
            "title": "分红除权" + (f"（{detail}）" if detail else ""),
            "title_en": "Ex-dividend" + (f" (CNY {ratio} per 10 shares)" if detail else ""),
        })
    return events


_DIVIDEND_BUDGET = 8 * 60   # seconds; about 45s on a normal day


def _fetch_dividends() -> list:
    """Ex-dividend dates for widely held names. cninfo only answers per stock (there is no
    working market-wide feed from the server), so a fixed list is queried one by one: its request
    signing runs in an embedded V8 (mini_racer) that crashes the process when used from several
    threads at once. Runs in the background refresh, ~0.7s per stock."""
    events = []
    deadline = time.time() + _DIVIDEND_BUDGET
    for code in _dividend_watchlist():
        if time.time() > deadline:      # cninfo slowed right down: keep what we have, finish the build
            logger.warning("calendar dividends: time budget used, stopped before %s", code)
            break
        events.extend(_dividends_for(code))
    return events


def _fetch_ipos() -> list:
    """New share subscriptions and listings (Eastmoney's IPO table, reachable from the server)."""
    events = []
    try:
        df = ak.stock_xgsglb_em(symbol="全部股票")
        if df is None or df.empty:
            return events
        for _, row in df.iterrows():
            code = str(row.get("股票代码", "")).zfill(6)
            name = str(row.get("股票简称") or _get_name(code))
            price = row.get("发行价格")
            price_txt = f"，发行价 {price} 元" if price is not None and str(price) != "nan" else ""
            price_en = f", offer price CNY {price}" if price_txt else ""
            sub = _cell_date(row.get("申购日期"))
            if sub and _in_window(sub):
                events.append({"date": sub.isoformat(), "type": "ipo", "symbol": code, "name": name,
                               "title": "新股申购" + price_txt, "title_en": "IPO subscription" + price_en})
            lst = _cell_date(row.get("上市日期"))
            if lst and _in_window(lst):
                events.append({"date": lst.isoformat(), "type": "ipo", "symbol": code, "name": name,
                               "title": "新股上市", "title_en": "IPO listing"})
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


def _build() -> dict:
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=3) as ex:
        parts = [ex.submit(f) for f in (_fetch_earnings, _fetch_dividends, _fetch_ipos)]
        all_events = _fetch_holidays() + [e for p in parts for e in p.result()]
    seen, unique = set(), []
    for e in all_events:
        k = (e["date"], e["type"], e["symbol"], e["title"])
        if k not in seen:
            seen.add(k)
            unique.append(e)
    all_events = unique
    _type_order = {"holiday": 0, "earnings": 1, "dividend": 2, "ipo": 3}
    all_events.sort(key=lambda e: (e["date"], _type_order.get(e["type"], 9)))
    return {"events": all_events, "updated": datetime.now().strftime("%Y-%m-%d %H:%M")}


_refreshing = False


_DISK = os.path.join(os.path.dirname(__file__), "..", "data", "calendar_events.cache.json")


def _load_disk() -> None:
    """Serve the last build right after a restart (a cold build takes ~45s); it refreshes as usual."""
    global _cache_ts, _cache_data
    try:
        with open(_DISK, encoding="utf-8") as f:
            _cache_data = json.load(f)
        _cache_ts = os.path.getmtime(_DISK)
    except Exception:
        pass


_load_disk()


_refresh_started = 0.0
_refresh_gen = 0
_STUCK_AFTER = 20 * 60     # a build normally takes about a minute


def _refresh(gen: int):
    global _cache_ts, _cache_data, _refreshing
    t0 = time.time()
    try:
        data = _build()
        if data["events"] or _cache_data is None:
            _cache_data, _cache_ts = data, time.time()
        if data["events"]:
            try:
                tmp = _DISK + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False)
                os.replace(tmp, _DISK)
            except Exception as e:
                logger.warning("calendar cache write failed: %s", e)
        logger.info("calendar built: %d events in %.0fs", len(data["events"]), time.time() - t0)
    except Exception as e:
        logger.warning("calendar build failed: %s", e)
    finally:
        if gen == _refresh_gen:      # a build given up on as stuck must not clear its successor's flag
            _refreshing = False


def _start_refresh() -> None:
    """One build at a time. A build still running after _STUCK_AFTER is treated as hung (a feed that
    stops answering mid-response): a new one starts, so the calendar cannot freeze for days."""
    global _refreshing, _refresh_started, _refresh_gen
    now = time.time()
    if _refreshing and now - _refresh_started < _STUCK_AFTER:
        return
    if _refreshing:
        logger.warning("calendar build running for %.0f min, starting a new one", (now - _refresh_started) / 60)
    _refreshing, _refresh_started = True, now
    _refresh_gen += 1
    import threading
    threading.Thread(target=_refresh, args=(_refresh_gen,), daemon=True, name="calendar-refresh").start()


def warmup():
    _start_refresh()


@router.get("/events")
def calendar_events():
    """Cached for 6 hours and always built in the background (a cold build takes ~45s because
    cninfo has to be queried one stock at a time); a cold cache answers {"loading": true}."""
    if _cache_data is None:
        _start_refresh()
        return {"events": [], "loading": True}
    if time.time() - _cache_ts > _CACHE_TTL:
        _start_refresh()
    return _cache_data

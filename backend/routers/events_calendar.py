"""
Events calendar: /api/events/week and /api/events/day

One week strip (Sunday to Saturday, a count per event type per day) and one table per type and day:
economic releases, earnings, IPOs, stock splits and dividends. Everything comes from Nasdaq's public
calendars (services/nasdaq.py); the economic rows reuse the existing macro calendar (importance, surprise,
"why it matters") so /macro keeps everything it had.

Each (type, day) is cached on its own: past days 24 h, today and later 1 h. A failed request is never
cached and shows up as `error: true`, so the page can say so instead of claiming an empty day. The week
strip is built from the same per-day caches, never more than 6 requests at a time.
"""

import logging
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query

from routers import macro
from services import nasdaq as nq

router = APIRouter()
log = logging.getLogger("events_calendar")

TYPES = ("economic", "earnings", "ipos", "splits", "dividends")
_pool = ThreadPoolExecutor(max_workers=6)      # Nasdaq is a public service: never more than 6 at once
SOURCE = "Nasdaq"
_THE_TAIL = re.compile(r"^(.+?),?\s*\(The\)(.*)$")


# ── Small parsers ─────────────────────────────────────────────────────────────

def _money(v):
    """'$1,234.5' / '($0.23)' / '-$0.23' / '' / 'N/A' -> float (None when blank). Parentheses mean negative."""
    s = str(v if v is not None else "").strip()
    neg = s.startswith("(") and s.endswith(")")
    x = nq.num(s.strip("()") if neg else s)
    return None if x is None else (-x if neg else x)


def _int(v):
    x = nq.num(v)
    return None if x is None else int(x)


def _name(v):
    """Nasdaq files "Coca-Cola Company (The)" and leaves runs of spaces."""
    s = " ".join(str(v or "").split())
    m = _THE_TAIL.match(s)
    return f"The {m.group(1)}{m.group(2)}".strip() if m else s


def _timing(raw):
    r = str(raw or "")
    return "before_open" if "pre" in r else "after_close" if "after" in r else None


# ── One day of one type: each returns {"rows": [...]} or None when Nasdaq did not answer ──────────────

def _earnings_rows(d: date):
    data = nq.get("calendar/earnings", {"date": d.isoformat()})
    if data is None:
        return None
    rows = []
    for r in data.get("rows") or []:
        sym = (r.get("symbol") or "").strip()
        if not sym:
            continue
        rows.append({
            "symbol": sym, "name": _name(r.get("name")), "timing": _timing(r.get("time")),
            "eps_estimate": _money(r.get("epsForecast")), "estimates": _int(r.get("noOfEsts")),
            "last_year_eps": _money(r.get("lastYearEPS")), "last_year_date": nq.parse_date(r.get("lastYearRptDt")),
            "market_cap": _money(r.get("marketCap")), "fiscal_quarter": (r.get("fiscalQuarterEnding") or "").strip() or None,
        })
    # Biggest companies first (the ones students have heard of); no market cap sorts last
    rows.sort(key=lambda x: (x["market_cap"] is None, -(x["market_cap"] or 0), x["symbol"]))
    return {"rows": rows}


def _dividend_rows(d: date):
    data = nq.get("calendar/dividends", {"date": d.isoformat()})
    if data is None:
        return None
    iso = d.isoformat()
    rows = []
    for r in ((data.get("calendar") or {}).get("rows")) or []:
        ex = nq.parse_date(r.get("dividend_Ex_Date"))
        sym = (r.get("symbol") or "").strip()
        if not sym or (ex and ex != iso):
            continue
        rows.append({
            "symbol": sym, "name": _name(r.get("companyName")), "amount": _money(r.get("dividend_Rate")),
            "annual": _money(r.get("indicated_Annual_Dividend")), "ex_date": ex or iso,
            "record_date": nq.parse_date(r.get("record_Date")), "payment_date": nq.parse_date(r.get("payment_Date")),
            "announcement_date": nq.parse_date(r.get("announcement_Date")),
        })
    rows.sort(key=lambda x: x["symbol"])
    return {"rows": rows}


def _splits_all():
    """Nasdaq's splits list ignores the date and returns every announced split (upcoming only), so it is
    fetched once and cut per day. Days before today therefore always read empty."""
    def fetch():
        data = nq.get("calendar/splits", {"date": datetime.now(nq.ET).date().isoformat()})
        if data is None:
            return None
        out = []
        for r in data.get("rows") or []:
            eff = nq.parse_date(r.get("executionDate"))
            sym = (r.get("symbol") or "").strip()
            if sym and eff:
                out.append({"symbol": sym, "name": _name(r.get("name")), "ratio": (r.get("ratio") or "").strip() or None,
                            "effective_date": eff})
        return {"rows": out}
    return nq.cached("ev_splits_all", 3600, fetch)


def _split_rows(d: date):
    allr = _splits_all()
    if allr is None:
        return None
    rows = sorted((r for r in allr["rows"] if r["effective_date"] == d.isoformat()), key=lambda x: x["symbol"])
    return {"rows": rows}


def _ipo_month(month: str):
    """ipo/calendar?date=YYYY-MM: priced, upcoming and filed deals of one month, cut per day by the callers."""
    def fetch():
        data = nq.get("ipo/calendar", {"date": month})
        if data is None:
            return None
        deals = []

        def add(r, status, when):
            iso = nq.parse_date(when)
            name = " ".join(str(r.get("companyName") or "").split())
            if not iso or not name:
                return
            price_text = (r.get("proposedSharePrice") or "").strip() or None
            deals.append({
                "date": iso, "symbol": (r.get("proposedTickerSymbol") or "").strip() or None, "company": name,
                "exchange": (r.get("proposedExchange") or "").strip() or None, "price_text": price_text,
                "price": nq.num(price_text) if price_text and "-" not in price_text else None,
                "shares": _int(r.get("sharesOffered")), "deal_size": _money(r.get("dollarValueOfSharesOffered")),
                "status": status,
            })
        for r in ((data.get("priced") or {}).get("rows")) or []:
            add(r, "priced", r.get("pricedDate"))
        for r in (((data.get("upcoming") or {}).get("upcomingTable") or {}).get("rows")) or []:
            add(r, "expected", r.get("expectedPriceDate"))
        for r in ((data.get("filed") or {}).get("rows")) or []:
            add(r, "filed", r.get("filedDate"))
        return {"deals": deals}
    return nq.cached(f"ev_ipo_{month}", 3600, fetch)


_IPO_ORDER = {"priced": 0, "expected": 1, "filed": 2}


def _ipo_rows(d: date):
    m = _ipo_month(d.strftime("%Y-%m"))
    if m is None:
        return None
    rows = [dict(x) for x in m["deals"] if x["date"] == d.isoformat()]
    rows.sort(key=lambda x: (_IPO_ORDER[x["status"]], -(x["deal_size"] or 0), x["company"]))
    return {"rows": rows}


def _economic(d: date, lang: str):
    """The macro calendar's own per-day loader, classified. error=True when Nasdaq did not answer."""
    raw = macro._fetch_day(d)
    answered = d.isoformat() in macro._cache
    events = [macro._classify(ev, lang) for ev in raw]
    # Month-on-month / year-on-year pairs share a name and time; the smaller previous value is the monthly one
    groups = {}
    for e in events:
        if "%" in (e["previous"] + e["consensus"]):
            groups.setdefault((e["time_utc"], e["country"], e["name"].lower()), []).append(e)
    for pair in groups.values():
        if len(pair) == 2:
            ref = [abs(macro._num(x["previous"]) if macro._num(x["previous"]) is not None
                       else (macro._num(x["consensus"]) or 0)) for x in pair]
            mom, yoy = (pair[0], pair[1]) if ref[0] <= ref[1] else (pair[1], pair[0])
            mom["period"], yoy["period"] = "mom", "yoy"
    events.sort(key=lambda e: (e["time_utc"] or e["date"], -e["importance"], e.get("period") or ""))
    return events, answered


_LOADERS = {"earnings": _earnings_rows, "ipos": _ipo_rows, "splits": _split_rows, "dividends": _dividend_rows}


def _ttl(d: date) -> float:
    return 24 * 3600 if d < datetime.now(nq.ET).date() else 3600


def _day_rows(typ: str, d: date):
    """Rows of one non-economic type on one day, from the per-day cache; None when Nasdaq did not answer."""
    if typ in ("splits", "ipos"):                 # these cut a list that is cached once
        res = _LOADERS[typ](d)
    else:
        res = nq.cached(f"ev_{typ}_{d.isoformat()}", _ttl(d), lambda: _LOADERS[typ](d))
    return None if res is None else res["rows"]


# An economic event counts toward the strip when it is a US release of at least "worth watching" weight:
# the same set the page shows by default
def _economic_count(d: date):
    events, answered = _economic(d, "en")
    if not answered:
        return None
    return sum(1 for e in events if e["country"] == "United States" and e["importance"] >= 2)


# ── Endpoints ─────────────────────────────────────────────────────────────────

def _parse_day(s: str) -> date:
    try:
        return date.fromisoformat(s)
    except (ValueError, TypeError):
        raise HTTPException(400, "date must be YYYY-MM-DD")


def _sunday_on_or_before(d: date) -> date:
    return d - timedelta(days=(d.weekday() + 1) % 7)


@router.get("/week")
def week(start: str = Query(None, description="a Sunday, YYYY-MM-DD; default the current week in New York")):
    s = _parse_day(start) if start else _sunday_on_or_before(datetime.now(nq.ET).date())
    s = _sunday_on_or_before(s)                   # any day is accepted: the strip always starts on Sunday
    days = [s + timedelta(days=i) for i in range(7)]

    def count(args):
        typ, d = args
        try:
            if typ == "economic":
                return _economic_count(d)
            rows = _day_rows(typ, d)
            return None if rows is None else len(rows)
        except Exception as exc:
            log.warning("events week %s %s: %s", typ, d, exc)
            return None

    jobs = [(t, d) for d in days for t in TYPES]
    results = list(_pool.map(count, jobs))
    out = []
    for i, d in enumerate(days):
        counts = {t: results[i * len(TYPES) + j] for j, t in enumerate(TYPES)}
        out.append({"date": d.isoformat(), "counts": counts})
    return {"start": days[0].isoformat(), "end": days[-1].isoformat(), "days": out, "source": SOURCE}


@router.get("/day")
def day(date: str = Query(..., description="YYYY-MM-DD"), type: str = Query("economic"), lang: str = Query("en")):
    d = _parse_day(date)
    if type not in TYPES:
        raise HTTPException(400, f"type must be one of {', '.join(TYPES)}")
    lang = lang if lang in ("zh", "en", "ja", "ko", "fr") else "en"
    out = {"date": d.isoformat(), "type": type, "rows": [], "source": SOURCE}
    try:
        if type == "economic":
            rows, answered = _economic(d, lang)
            out["rows"] = rows
            out["error"] = not answered
        else:
            rows = _day_rows(type, d)
            out["rows"] = rows or []
            out["error"] = rows is None
    except Exception as exc:
        log.warning("events day %s %s: %s", type, d, exc)
        out["error"] = True
    if type == "splits":
        out["note"] = "Nasdaq lists announced splits that have not happened yet, so earlier days show none."
    return out

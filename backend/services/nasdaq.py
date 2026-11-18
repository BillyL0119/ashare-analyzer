"""
Nasdaq's public quote data (api.nasdaq.com), shared by the quote pages (/api/us/quote/*) and the events
calendar (/api/events/*).

One HTTP client, one set of parsers and one cache, plus the few figures that two tabs both show (EPS, P/E,
beta, average volume) computed in one place, so the Summary and Statistics tabs can never disagree.

Everything here returns None / [] when Nasdaq has no answer and never raises: callers show "—".
Nasdaq is reachable from the production server (the fundamentals, screener and macro calendar already use it).
"""

import json
import logging
import os
import re
import threading
import time
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import requests

log = logging.getLogger("nasdaq")

BASE = "https://api.nasdaq.com/api"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126 Safari/537.36",
    "Accept": "application/json",
}
ET = ZoneInfo("America/New_York")
SYMBOL_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")
BENCHMARK = "SPY"          # the S&P 500 as an investable fund: comparisons and beta use its price

_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "us_cache")
os.makedirs(_CACHE_DIR, exist_ok=True)


def clean_symbol(symbol: str):
    """'brk-b' -> 'BRK.B'; None when it is not a plausible US ticker."""
    s = (symbol or "").strip().upper().replace("-", ".")
    return s if SYMBOL_RE.match(s) else None


# ── HTTP ──────────────────────────────────────────────────────────────────────

def get(path: str, params: dict = None, timeout: float = 8):
    """GET {BASE}/{path} and return the payload's "data" (None on any failure)."""
    try:
        r = requests.get(f"{BASE}/{path}", params=params, headers=HEADERS, timeout=timeout)
        j = r.json()
        return j.get("data") if isinstance(j, dict) else None
    except Exception as exc:
        log.debug("nasdaq %s failed: %s", path, exc)
        return None


# ── Parsers ───────────────────────────────────────────────────────────────────

_NUM_JUNK = re.compile(r"[,$%\s]|\(m\)$")


def num(v):
    """'$1,234.5' / '-$5' / '12.5%' / '$143,756(m)' / '--' / 'N/A' -> float or None. '(m)' keeps millions as
    written: multiply where the unit matters."""
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = _NUM_JUNK.sub("", str(v).strip())
    if s in ("", "-", "--", "N/A", "NA", "null", "None"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_date(s):
    """'11/17/2026', 'Nov 12, 2026', '2026-11-12', '$2.84 (12/27/2025)' -> '2026-11-17' (None if no date)."""
    if not s or not isinstance(s, str):
        return None
    m = re.search(r"\d{1,2}/\d{1,2}/\d{4}|[A-Z][a-z]{2} \d{1,2}, \d{4}|\d{4}-\d{2}-\d{2}", s)
    if not m:
        return None
    for fmt in ("%m/%d/%Y", "%b %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(m.group(0), fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def val(d, key):
    """summaryData-style {key: {"label", "value"}} -> the value (None for blanks)."""
    x = (d or {}).get(key) or {}
    v = x.get("value") if isinstance(x, dict) else None
    return None if isinstance(v, str) and v.strip() in ("", "N/A", "NA", "--") else v


# ── Cache ─────────────────────────────────────────────────────────────────────
# Memory first, optional disk copy (backend/data/us_cache/nq_*.json, gitignored) for slow-changing data
# so a restart does not refetch ten years of prices. Empty results are never cached.

_mem: dict = {}
_lock = threading.Lock()
_inflight: dict = {}


def _empty(v):
    return v is None or (isinstance(v, (list, dict)) and not v)


def cached(key: str, ttl: float, fn, disk: bool = False):
    now = time.time()
    with _lock:
        hit = _mem.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
        ev = _inflight.get(key)
        owner = ev is None
        if owner:
            ev = _inflight[key] = threading.Event()
    if not owner:                       # someone is already fetching this key: wait for their result
        ev.wait(30)
        hit = _mem.get(key)
        return hit[1] if hit else None
    try:
        path = os.path.join(_CACHE_DIR, f"nq_{re.sub(r'[^A-Za-z0-9_.-]', '_', key)}.json")
        if disk and os.path.exists(path) and now - os.path.getmtime(path) < ttl:
            try:
                with open(path, encoding="utf-8") as f:
                    v = json.load(f)
                with _lock:
                    _mem[key] = (os.path.getmtime(path), v)
                return v
            except Exception:
                pass
        v = fn()
        if not _empty(v):
            with _lock:
                _mem[key] = (time.time(), v)
            if disk:
                try:
                    with open(path + ".tmp", "w", encoding="utf-8") as f:
                        json.dump(v, f)
                    os.replace(path + ".tmp", path)
                except Exception:
                    pass
        return v
    finally:
        with _lock:
            _inflight.pop(key, None)
        ev.set()


def market_open_now() -> bool:
    """Regular session (9:30-16:00 ET, Mon-Fri). Holidays count as open; it only shortens cache times."""
    t = datetime.now(ET)
    return t.weekday() < 5 and (9, 30) <= (t.hour, t.minute) < (16, 0)


def live_ttl() -> float:
    return 15 if market_open_now() else 300


# ── Instrument ────────────────────────────────────────────────────────────────

def asset_class(sym: str):
    """'stocks' or 'etf' (Nasdaq answers each ticker only under its own class), None if unknown."""
    def find():
        for ac in ("stocks", "etf"):
            d = get(f"quote/{sym}/info", {"assetclass": ac})
            if d and d.get("primaryData") and d["primaryData"].get("lastSalePrice"):
                return ac
        return None
    return cached(f"ac_{sym}", 7 * 86400, find, disk=True)


def info(sym: str):
    """quote/{sym}/info: last sale, bid/ask, market status, pre/after-hours (secondaryData). ~15 s fresh."""
    ac = asset_class(sym)
    if not ac:
        return None
    return cached(f"info_{sym}", live_ttl(), lambda: get(f"quote/{sym}/info", {"assetclass": ac}))


def summary(sym: str):
    """quote/{sym}/summary summaryData: previous close, day and 52-week range, market cap, 1y target,
    dividend, ex-date. Values are {"label", "value"}: read them with val()."""
    ac = asset_class(sym)
    if not ac:
        return None

    def fetch():
        d = get(f"quote/{sym}/summary", {"assetclass": ac})
        return (d or {}).get("summaryData") or None
    return cached(f"summary_{sym}", 300, fetch)


# ── Prices ────────────────────────────────────────────────────────────────────

def daily_history(sym: str) -> list:
    """Ten years of daily bars, oldest first: [{"date", "open", "high", "low", "close", "volume"}].
    Split-adjusted (Nasdaq rewrites history on a split), not dividend-adjusted. Completed sessions only:
    today's bar appears after the close. Cached 6 h, on disk."""
    def fetch():
        ac = asset_class(sym)
        if not ac:
            return []
        today = datetime.now(ET).date()
        d = get(f"quote/{sym}/historical", {
            "assetclass": ac, "fromdate": (today - timedelta(days=3653)).isoformat(),
            "todate": today.isoformat(), "limit": 9999,
        }, timeout=20)
        rows = (((d or {}).get("tradesTable") or {}).get("rows")) or []
        out = []
        for r in rows:
            day, close = parse_date(r.get("date")), num(r.get("close"))
            if not day or close is None:
                continue
            out.append({"date": day, "open": num(r.get("open")), "high": num(r.get("high")),
                        "low": num(r.get("low")), "close": close, "volume": num(r.get("volume"))})
        out.sort(key=lambda x: x["date"])
        return out
    return cached(f"hist_{sym}", 6 * 3600, fetch, disk=True) or []


def dividends(sym: str) -> list:
    """Cash dividends, oldest first: [{"ex_date", "amount", "pay_date", "record_date", "declared_date", "type"}]."""
    def fetch():
        ac = asset_class(sym)
        if not ac:
            return []
        d = get(f"quote/{sym}/dividends", {"assetclass": ac})
        rows = (((d or {}).get("dividends") or {}).get("rows")) or []
        out = []
        for r in rows:
            ex, amt = parse_date(r.get("exOrEffDate")), num(r.get("amount"))
            if not ex or amt is None:
                continue
            out.append({"ex_date": ex, "amount": amt, "pay_date": parse_date(r.get("paymentDate")),
                        "record_date": parse_date(r.get("recordDate")),
                        "declared_date": parse_date(r.get("declarationDate")), "type": r.get("type")})
        out.sort(key=lambda x: x["ex_date"])
        return out
    return cached(f"divs_{sym}", 12 * 3600, fetch, disk=True) or []


def close_on_or_before(rows: list, day: str):
    """The last bar dated <= day (rows oldest first), or None."""
    lo, hi = 0, len(rows)
    while lo < hi:
        mid = (lo + hi) // 2
        if rows[mid]["date"] <= day:
            lo = mid + 1
        else:
            hi = mid
    return rows[lo - 1] if lo else None


def pct_change(new, old):
    return round((new / old - 1) * 100, 2) if new is not None and old else None


# ── Shared figures (Summary and Statistics both show these) ───────────────────

def quarterly_results(sym: str) -> list:
    """Reported quarters, oldest first: [{"period_end", "revenue", "eps"}], revenue in USD, EPS as reported
    (diluted, GAAP) from company/{sym}/revenue (three fiscal years)."""
    def fetch():
        d = get(f"company/{sym}/revenue", {"limit": 1})
        rows = (((d or {}).get("revenueTable") or {}).get("rows")) or []
        out, quarter = [], None
        cols = ("value2", "value3", "value4")
        rev = {}
        for r in rows:
            label = (r.get("value1") or "").strip()
            if label not in ("Revenue", "EPS", "Dividends"):
                quarter = label            # a month name heads each block
                rev = {}
                continue
            if label == "Revenue":
                rev = {c: num(r.get(c)) for c in cols}
            elif label == "EPS":
                for c in cols:
                    end = parse_date(r.get(c) or "")
                    if not end:
                        continue
                    r_m = rev.get(c)
                    out.append({"period_end": end, "eps": num((r.get(c) or "").split("(")[0]),
                                "revenue": r_m * 1e6 if r_m is not None else None, "quarter": quarter})
        out.sort(key=lambda x: x["period_end"])
        return out
    return cached(f"qres_{sym}", 12 * 3600, fetch, disk=True) or []


def eps_ttm(sym: str):
    """Sum of the last four reported quarterly EPS, or None when the four are not consecutive."""
    q = [x for x in quarterly_results(sym) if x["eps"] is not None]
    if len(q) < 4:
        return None
    last4 = q[-4:]
    span = (date.fromisoformat(last4[-1]["period_end"]) - date.fromisoformat(last4[0]["period_end"])).days
    if not 250 <= span <= 300:          # three quarter-gaps apart; anything else means a missing quarter
        return None
    return round(sum(x["eps"] for x in last4), 4)


def pe_ttm(price, eps):
    """Price / trailing EPS; None when earnings are zero or negative (a P/E is not meaningful then)."""
    return round(price / eps, 2) if price and eps and eps > 0 else None


def avg_volume(sym: str, sessions: int = 63):
    """Mean daily volume over the last N completed sessions (63 ~ three months, 10 ~ two weeks)."""
    rows = [r for r in daily_history(sym)[-sessions:] if r["volume"]]
    return round(sum(r["volume"] for r in rows) / len(rows)) if len(rows) >= min(sessions, 5) else None


def _month_ends(rows: list) -> dict:
    out = {}
    for r in rows:
        out[r["date"][:7]] = r["close"]      # rows are oldest first: the last bar of each month wins
    return out


def beta_5y_monthly(sym: str):
    """Beta against the S&P 500 (SPY) from 60 monthly price returns, the way Yahoo labels it "Beta (5Y
    Monthly)". None with fewer than 36 months of history. The current, unfinished month is left out."""
    if sym == BENCHMARK:
        return 1.0
    a, b = _month_ends(daily_history(sym)), _month_ends(daily_history(BENCHMARK))
    this_month = datetime.now(ET).strftime("%Y-%m")
    months = sorted(m for m in a if m in b and m < this_month)[-61:]
    if len(months) < 37:
        return None
    ra = [a[m] / a[p] - 1 for p, m in zip(months, months[1:])]
    rb = [b[m] / b[p] - 1 for p, m in zip(months, months[1:])]
    n = len(ra)
    ma, mb = sum(ra) / n, sum(rb) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / (n - 1)
    var = sum((y - mb) ** 2 for y in rb) / (n - 1)
    return round(cov / var, 2) if var else None

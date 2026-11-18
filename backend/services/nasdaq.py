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
    """'$1,234.5' / '-$5' / '($0.33)' / '12.5%' / '$143,756(m)' / '--' / 'N/A' -> float or None. Accounting
    parentheses mean negative. '(m)' keeps millions as written: multiply where the unit matters."""
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = _NUM_JUNK.sub("", str(v).strip())
    neg = s.startswith("(") and s.endswith(")")
    if neg:
        s = s[1:-1]
    if s in ("", "-", "--", "N/A", "NA", "null", "None"):
        return None
    try:
        return -float(s) if neg else float(s)
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


def _nasdaq_dividends(sym: str):
    """Nasdaq's dividend table as paid, oldest first; [] when it lists none (it has none for NYSE listings such
    as KO or JNJ, nor for ETFs), None when the request failed."""
    ac = asset_class(sym)
    if not ac:
        return None
    d = get(f"quote/{sym}/dividends", {"assetclass": ac})
    if d is None:
        return None
    out = []
    for r in (((d.get("dividends") or {}).get("rows")) or []):
        ex, amt = parse_date(r.get("exOrEffDate")), num(r.get("amount"))
        if not ex or amt is None or amt <= 0:
            continue
        out.append({"ex_date": ex, "amount_paid": amt, "pay_date": parse_date(r.get("paymentDate")),
                    "record_date": parse_date(r.get("recordDate")),
                    "declared_date": parse_date(r.get("declarationDate"))})
    return sorted(out, key=lambda x: x["ex_date"])


def split_factor_after(split_rows: list, day: str) -> float:
    """How many of today's shares one share held on `day` has become: the product of the ratios of the
    splits dated after it (a split's date is its first trading day at the new price)."""
    f = 1.0
    for s in split_rows:
        if s["date"] > day:
            f *= s["ratio"]
    return f


def dividends(sym: str) -> list:
    """Cash dividends of the last ten years, oldest first: [{"ex_date", "amount", "amount_paid", "pay_date",
    "record_date", "declared_date", "source"}]. `amount` is per share as it is today, i.e. divided by the
    splits since (prices are split-adjusted too, so the two compare); `amount_paid` is what was paid then.
    Nasdaq's table first (it has the pay and record dates); Tencent's ex-date notes when Nasdaq lists none.
    [] for a company that pays none; also [] when neither source answered (that is not cached)."""
    def fetch():
        ca = corporate_actions(sym)
        if ca is None:
            return None                     # without the splits the amounts cannot be put on today's shares
        rows, src = _nasdaq_dividends(sym), "Nasdaq"
        if not rows:
            rows = [{"ex_date": d["ex_date"], "amount_paid": d["amount_paid"], "pay_date": None,
                     "record_date": None, "declared_date": None} for d in ca["dividends"]]
            src = "Tencent"
        cutoff = (datetime.now(ET).date() - timedelta(days=3653)).isoformat()
        out = [{**r, "amount": round(r["amount_paid"] / split_factor_after(ca["splits"], r["ex_date"]), 6), "source": src}
               for r in rows if r["ex_date"] >= cutoff]
        return {"rows": out}                # a dict, so "no dividends" is cached as well
    return (cached(f"divs2_{sym}", 12 * 3600, fetch, disk=True) or {}).get("rows") or []


# ── Corporate actions (Tencent) ───────────────────────────────────────────────
# Nasdaq's prices are split-adjusted but its dividend table is as paid, has no splits, and is empty for NYSE
# listings. Tencent's unadjusted daily K-line notes every ex-date ("每股分配0.42美元") and split ("每1股拆分成4股")
# for all US listings: splits come from there, and dividends too when Nasdaq has none.

_TENCENT_RAW = "https://web.ifzq.gtimg.cn/appstock/app/kline/kline"


def _tencent_rows(code: str, start: str, end: str, n: int):
    """Unadjusted daily rows [date, open, close, high, low, volume, notes?]; None when the request failed."""
    try:
        r = requests.get(_TENCENT_RAW, params={"param": f"{code},day,{start},{end},{n}"}, timeout=10)
        data = (r.json() or {}).get("data")
    except Exception as exc:
        log.debug("tencent raw %s failed: %s", code, exc)
        return None
    if not isinstance(data, dict) or not data:
        return []
    node = next(iter(data.values()))
    return (node.get("day") or []) if isinstance(node, dict) else []


def _suffix_order(exchange: str) -> list:
    ex = (exchange or "").upper().replace(" ", "").replace("-", "")
    first = ".AM" if any(k in ex for k in ("AMERICAN", "ARCA", "AMEX", "MKT", "BATS", "CBOE")) else \
            ".N" if "NYSE" in ex else ".OQ" if "NASDAQ" in ex else None
    return ([first] if first else []) + [s for s in (".OQ", ".N", ".AM") if s != first]


def tencent_code(sym: str):
    """'usAAPL.OQ' / 'usKO.N' / 'usSPY.AM': Tencent's code for a US ticker (its suffix follows the listing
    exchange), checked against Tencent; None when no suffix answers."""
    def find():
        today = datetime.now(ET).date()
        for suf in _suffix_order(str((info(sym) or {}).get("exchange") or "")):
            if _tencent_rows(f"us{sym}{suf}", (today - timedelta(days=14)).isoformat(), today.isoformat(), 10):
                return f"us{sym}{suf}"
        return None
    return cached(f"tcode_{sym}", 30 * 86400, find, disk=True)


def corporate_actions(sym: str):
    """Ten years of splits and cash dividends from Tencent's notes, oldest first: {"splits": [{"date",
    "ratio"}], "dividends": [{"ex_date", "amount_paid"}]}. ratio = new shares per old one (4.0 for a
    4-for-1 split, 0.1 for a 1-for-10 reverse split). None when Tencent did not answer (not cached)."""
    from services.total_return import dividend, split_ratio      # the parsers of Tencent's notes

    def fetch():
        code = tencent_code(sym)
        if not code:
            return None
        today = datetime.now(ET).date()
        mid = today - timedelta(days=1826)              # Tencent serves about five years per request
        halves = [_tencent_rows(code, (today - timedelta(days=3660)).isoformat(), mid.isoformat(), 1400),
                  _tencent_rows(code, (mid + timedelta(days=1)).isoformat(), today.isoformat(), 1400)]
        if any(h is None for h in halves):
            return None
        splits, divs = [], []
        for row in halves[0] + halves[1]:
            notes = row[6] if len(row) > 6 and isinstance(row[6], dict) else None
            if not notes:
                continue
            ratio = split_ratio(notes.get("hgcgContent") or "")
            if ratio and abs(ratio - 1) > 1e-9:
                splits.append({"date": row[0], "ratio": ratio})
            cash = dividend(notes.get("FHcontent") or "", "us")
            if cash > 0:
                divs.append({"ex_date": row[0], "amount_paid": round(cash, 6)})
        return {"splits": splits, "dividends": divs}
    return cached(f"ca_{sym}", 12 * 3600, fetch, disk=True)


def splits(sym: str) -> list:
    """[{"date", "ratio"}] of the last ten years, oldest first ([] when none or unknown)."""
    return ((corporate_actions(sym) or {}).get("splits")) or []


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

_EPS_CELL = re.compile(r"\s*(\(\s*-?\$?[\d,.]+\s*\)|-?\$?-?[\d,.]+)")


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
                    amount = _EPS_CELL.match(r.get(c) or "")
                    out.append({"period_end": end, "eps": num(amount.group(1)) if amount else None,
                                "revenue": r_m * 1e6 if r_m is not None else None, "quarter": quarter})
        out.sort(key=lambda x: x["period_end"])
        return out
    return cached(f"qres2_{sym}", 12 * 3600, fetch, disk=True) or []


def eps_ttm(sym: str):
    """Sum of the last four reported quarterly EPS, or None when the four are not consecutive, or when the
    figure cannot belong to this share class: a profit per share above the share price means Nasdaq reported
    another class (BRK.B gets Class A's $53,762 against a $576 price)."""
    q = [x for x in quarterly_results(sym) if x["eps"] is not None]
    if len(q) < 4:
        return None
    last4 = q[-4:]
    span = (date.fromisoformat(last4[-1]["period_end"]) - date.fromisoformat(last4[0]["period_end"])).days
    if not 250 <= span <= 300:          # three quarter-gaps apart; anything else means a missing quarter
        return None
    total = round(sum(x["eps"] for x in last4), 4)
    hist = daily_history(sym)
    if total > 0 and hist and total > hist[-1]["close"]:
        return None
    return total


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

"""
Quote pages, Historical data tab: /api/us/quote/{symbol}/history

Daily bars come from Nasdaq (split-adjusted already). Dividends come from services/nasdaq.dividends: Nasdaq's
table, or Tencent's ex-date notes when Nasdaq lists none (NYSE listings, ETFs), already divided by the splits
since (Tencent's split records), so they compare with the split-adjusted prices. We add the adjusted close
ourselves, aggregate to weeks and months, and cut the range. Pure functions first (tested
without network), the route at the bottom.
"""

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query

from services import nasdaq

router = APIRouter()

RANGES = ("1m", "3m", "6m", "ytd", "1y", "2y", "5y", "10y")
INTERVALS = ("1d", "1wk", "1mo")
_MONTHS = {"1m": 1, "3m": 3, "6m": 6, "1y": 12, "2y": 24, "5y": 60, "10y": 120}


# ── Adjusted close ────────────────────────────────────────────────────────────

def add_adj_close(rows: list, divs: list) -> list:
    """Return copies of `rows` (oldest first) with "adj_close" added.

    CRSP / Yahoo method: for a dividend with ex-date X and previous close P (the last close before X), every
    close before X is multiplied by (1 - dividend / P). Factors of all later ex-dates multiply together, so
    adj_close(day) = close(day) * product over ex-dates after that day. Days from the last ex-date on keep
    adj_close = close. Splits are already in Nasdaq's prices, so nothing to do for them.
    A dividend is ignored when there is no earlier close to compare with (before the history starts) or when
    its ex-date is after the last bar (not happened yet in our data)."""
    if not rows:
        return []
    by_ex = defaultdict(float)
    for d in divs:
        if d.get("amount") and d["amount"] > 0:
            by_ex[d["ex_date"]] += d["amount"]          # two payments on one ex-date act as one
    factors = []                                         # (ex-date, factor), ascending
    for ex in sorted(by_ex):
        prev = None
        for r in rows:
            if r["date"] >= ex:
                break
            prev = r
        if prev is None or not prev["close"] or ex > rows[-1]["date"]:
            continue
        factors.append((ex, 1 - by_ex[ex] / prev["close"]))
    out, k, f = [], len(factors) - 1, 1.0
    # walk newest to oldest, folding each ex-date's factor in as soon as we step before it
    for r in reversed(rows):
        while k >= 0 and r["date"] < factors[k][0]:
            f *= factors[k][1]
            k -= 1
        out.append({**r, "adj_close": r["close"] * f})
    out.reverse()
    return out


# ── Ranges and aggregation ────────────────────────────────────────────────────

def _months_back(d: date, n: int) -> date:
    y, m = divmod(d.year * 12 + d.month - 1 - n, 12)
    m += 1
    nxt = date(y + (m == 12), m % 12 + 1, 1)
    return date(y, m, min(d.day, (nxt - timedelta(days=1)).day))


def range_start(today: date, rng: str) -> date:
    """First calendar day of the range. YTD starts on Jan 1, so it begins with the first session of the year."""
    if rng == "ytd":
        return date(today.year, 1, 1)
    return _months_back(today, _MONTHS[rng])


def _bar_key(day: str, interval: str) -> str:
    d = date.fromisoformat(day)
    if interval == "1wk":
        return (d - timedelta(days=d.weekday())).isoformat()      # the Monday
    return d.replace(day=1).isoformat()


def aggregate(rows: list, interval: str) -> list:
    """Weekly (Monday-based) or monthly bars from daily rows (oldest first): first open, max high, min low,
    last close and adj close, summed volume. Each bar is dated with its first session in `rows`, so a bar
    clipped by the range start is dated on that start rather than on a day outside the range."""
    if interval == "1d":
        return list(rows)
    groups = {}
    for r in rows:
        groups.setdefault(_bar_key(r["date"], interval), []).append(r)
    out = []
    for g in groups.values():
        vols = [x["volume"] for x in g if x["volume"] is not None]
        highs = [x["high"] for x in g if x["high"] is not None]
        lows = [x["low"] for x in g if x["low"] is not None]
        out.append({
            "date": g[0]["date"], "open": g[0]["open"],
            "high": max(highs) if highs else None, "low": min(lows) if lows else None,
            "close": g[-1]["close"], "adj_close": g[-1]["adj_close"],
            "volume": sum(vols) if vols else None,
        })
    return out


def _r(v, n=4):
    return None if v is None else round(v, n)


def build_history(daily: list, divs: list, rng: str, interval: str, today: date, adjusted: bool = True) -> dict:
    """The response body minus symbol/source/as_of. `daily` and `divs` oldest first; output newest first."""
    full = add_adj_close(daily, divs if adjusted else [])
    start = range_start(today, rng).isoformat()
    sel = [r for r in full if r["date"] >= start]
    bars = aggregate(sel, interval)
    rows = [{"date": b["date"], "open": _r(b["open"]), "high": _r(b["high"]), "low": _r(b["low"]),
             "close": _r(b["close"]), "adj_close": _r(b["adj_close"]),
             "volume": None if b["volume"] is None else int(round(b["volume"]))} for b in reversed(bars)]
    first = sel[0]["date"] if sel else None
    last = sel[-1]["date"] if sel else None
    shown = [{"date": d["ex_date"], "amount": round(d["amount"], 6)} for d in reversed(divs)
             if adjusted and first and first <= d["ex_date"] <= last and d.get("amount")]
    return {"from": first, "to": last, "rows": rows, "dividends": shown}


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{symbol}/history")
def history(symbol: str, range: str = Query("1y"), interval: str = Query("1d")):
    sym = nasdaq.clean_symbol(symbol)
    if not sym:
        raise HTTPException(400, "Invalid ticker")
    if range not in RANGES or interval not in INTERVALS:
        raise HTTPException(400, f"range must be one of {', '.join(RANGES)}; interval one of {', '.join(INTERVALS)}")
    daily = nasdaq.daily_history(sym)
    if not daily:
        raise HTTPException(404, "No price history for this ticker")
    divs = nasdaq.dividends(sym)
    today = datetime.now(nasdaq.ET).date()
    body = build_history(daily, divs, range, interval, today)
    return {
        "symbol": sym, "currency": "USD", "range": range, "interval": interval, **body,
        "adjusted": True, "dividend_data": bool(divs), "source": "Nasdaq",
        "dividend_source": divs[-1]["source"] if divs and divs[-1].get("source") else None,
        "as_of": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

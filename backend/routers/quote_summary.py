"""
Quote pages, Summary tab: /api/us/quote/{symbol}/live, /chart, /performance, /peers

Figures that the Statistics tab also shows (EPS, P/E, beta, average volume, previous close, 52-week range,
market cap, target, dividend) come from the shared functions in services/nasdaq.py so the two tabs agree.
Nothing is estimated: a value we cannot source is null and the page prints a dash.

The heavy routers (us_market, us_stocks, fundamentals, screener) are imported inside the functions that need
them: they pull in pandas, and the unit tests run without it.
"""

import json
import logging
import math
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

import requests
from fastapi import APIRouter, HTTPException, Query

from services import nasdaq as nq

router = APIRouter()
log = logging.getLogger("quote_summary")
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="quote-summary")

RANGES = ("1d", "5d", "1m", "6m", "ytd", "1y", "5y", "10y")
_NAME_TAIL = re.compile(r"\s+(Class [A-C] )?(Common Stock|Ordinary Shares|American Deposit[ao]ry Shares?|Common Shares|"
                        r"Capital Stock|Shares of Beneficial Interest)\b.*$", re.I)
_OPEN_PAREN = re.compile(r"\s*\([^)]*$")
_STAMP = re.compile(r"([A-Z][a-z]{2} \d{1,2}, \d{4})(?:\D*?(\d{1,2}:\d{2} [AP]M))?")


def _symbol(symbol: str) -> str:
    sym = nq.clean_symbol(symbol)
    if not sym:
        raise HTTPException(status_code=400, detail="Invalid symbol")
    if not nq.asset_class(sym):
        raise HTTPException(status_code=404, detail=f"No quote for {sym}")
    return sym


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _tidy_name(name):
    name = " ".join((name or "").split())
    name = _OPEN_PAREN.sub("", _NAME_TAIL.sub("", name)).strip(" ,") or name
    m = re.match(r"^(.+?),?\s*\(The\)(.*)$", name)
    return f"The {m.group(1)}{m.group(2)}".strip() if m else name or None


def _int(v):
    return round(v) if v is not None else None


def _pair(s):
    """'$356.42/$351.47' -> (356.42, 351.47)."""
    if not isinstance(s, str) or "/" not in s:
        return None, None
    a, b = s.split("/", 1)
    return nq.num(a), nq.num(b)


def _stamp(text):
    """'Nov 18, 2026 11:52 AM ET' -> ('2026-11-18', '11:52 AM ET', '11:52 AM' as minutes since midnight)."""
    m = _STAMP.search(text or "") if isinstance(text, str) else None
    if not m:
        return None, None, None
    day = nq.parse_date(m.group(1))
    if not m.group(2):
        return day, None, None
    t = datetime.strptime(m.group(2), "%I:%M %p")
    return day, f"{m.group(2)} ET", t.hour * 60 + t.minute


def _status(raw) -> str:
    s = (raw or "").lower()
    if "closed" in s:
        return "closed"
    if "pre" in s:
        return "pre"
    if "after" in s or "post" in s:
        return "post"
    if "open" in s:
        return "open"
    return "closed"


def _extended(info, status):
    """The pre-market / after-hours line: Nasdaq's extended trade (see nq.regular_and_extended), labelled by the
    market status (pre-market before the open, after hours from the close until the next pre-market)."""
    _, ext = nq.regular_and_extended(info)
    if not isinstance(ext, dict):
        return None
    price = nq.num(ext.get("lastSalePrice"))
    if price is None:
        return None
    text = " ".join((ext.get("lastTradeTimestamp") or "").split()) or None
    return {"session": "pre" if status == "pre" else "post", "price": price, "change": nq.num(ext.get("netChange")),
            "change_pct": nq.num(ext.get("percentageChange")), "as_of_text": text}


# ── live ──────────────────────────────────────────────────────────────────────

def _tencent_open(sym):
    """Today's opening price from the Tencent quote feed (Nasdaq's summary has none). Shares the cache of
    get_us_realtime but skips its Polygon company lookup, which does not work from production."""
    try:
        from routers.us_market import _cached, _ttl, us_quotes
        q = _cached("rt:" + sym, _ttl(), lambda: us_quotes([sym]).get(sym))
        return q.get("open") if q else None
    except Exception as exc:
        log.debug("tencent open %s failed: %s", sym, exc)
        return None


def _next_earnings(sym):
    """{date, timing, eps_estimate} for a report still ahead; {date: None, announced: False} when Nasdaq answers
    that its vendor (Zacks) has no date yet (AAPL two months before it reports); None when the request failed.
    One small Nasdaq call, cached 6 h (a failure is not cached)."""
    def fetch():
        d = nq.get(f"analyst/{sym}/earnings-date")
        if d is None:
            return None
        text = d.get("announcement") or ""
        report = d.get("reportText") or ""
        day = nq.parse_date(text) or nq.parse_date(report)
        if not day:
            return {"date": None, "timing": None, "eps_estimate": None, "announced": False}
        est = re.search(r"consensus EPS forecast for the quarter is \$(-?\d+(?:\.\d+)?)", report)
        timing = ("after_close" if "after market close" in report
                  else "before_open" if "before market open" in report else None)
        return {"date": day, "timing": timing, "eps_estimate": float(est.group(1)) if est else None, "announced": True}
    e = nq.cached(f"qs_earn2_{sym}", 6 * 3600, fetch)
    if not e:
        return None
    if e["date"] and e["date"] < datetime.now(nq.ET).date().isoformat():
        return {"date": None, "timing": None, "eps_estimate": None, "announced": False}   # reported: next not set
    return e


def build_live(sym: str, fast: bool = False) -> dict:
    """The live quote. `fast` skips the figures that need ten years of prices or other slow calls (EPS and P/E,
    beta, average volume, dividend, next earnings): the header, price, ranges, market cap and target are back
    in about a second and `partial` is true, so a page can draw at once and fill the rest from the full answer."""
    # Start every call at once: the first answer used to wait for the quote before the others began
    jobs = {
        "summary": _pool.submit(nq.summary, sym),
        "open": _pool.submit(_tencent_open, sym),
    }
    info = nq.info(sym)
    if not info:
        raise HTTPException(status_code=404, detail=f"No quote for {sym}")
    if not fast:
        jobs.update({
            "eps": _pool.submit(nq.eps_ttm, sym),
            "beta": _pool.submit(nq.beta_5y_monthly, sym),
            "avgvol": _pool.submit(nq.avg_volume, sym, 63),
            "earn": _pool.submit(_next_earnings, sym),
            "divs": _pool.submit(nq.dividends, sym),
        })
    got = {}
    for k, f in jobs.items():
        try:
            got[k] = f.result(timeout=40)
        except Exception as exc:
            log.warning("live %s %s failed: %s", sym, k, exc)
            got[k] = None
    summ = got["summary"] or {}
    p = info.get("primaryData") or {}             # the latest trade: bid / ask / volume
    reg, _ = nq.regular_and_extended(info)         # the regular-session price (the close after hours)
    price = nq.num(reg.get("lastSalePrice"))
    status = _status(info.get("marketStatus"))
    day, tm, _ = _stamp(reg.get("lastTradeTimestamp"))
    as_of_text = " ".join((reg.get("lastTradeTimestamp") or "").split()) or None

    day_high, day_low = _pair(nq.val(summ, "TodayHighLow"))
    wk_high, wk_low = _pair(nq.val(summ, "FiftTwoWeekHighLow"))
    vol = nq.num(p.get("volume"))
    eps = got.get("eps")
    fwd = ({"rate": None, "yield": None, "ex_date": None} if fast
           else nq.forward_dividend(summ, got.get("divs") or [], price))
    out = {
        "symbol": sym,
        "name": _tidy_name(info.get("companyName")),
        "exchange": info.get("exchange") or nq.val(summ, "Exchange"),
        "asset_class": "etf" if str(info.get("assetClass", "")).lower() == "etf" else "stocks",
        "currency": p.get("currency") or "USD",
        "price": price,
        "change": nq.num(reg.get("netChange")),
        "change_pct": nq.num(reg.get("percentageChange")),
        "prev_close": nq.num(nq.val(summ, "PreviousClose")),
        "open": got["open"],
        "day_low": day_low, "day_high": day_high,
        "week52_low": wk_low, "week52_high": wk_high,
        "volume": round(vol) if vol is not None else None,
        "avg_volume_3m": got.get("avgvol"),
        "bid": nq.num(p.get("bidPrice")), "bid_size": _int(nq.num(p.get("bidSize"))),
        "ask": nq.num(p.get("askPrice")), "ask_size": _int(nq.num(p.get("askSize"))),
        "market_cap": nq.num(nq.val(summ, "MarketCap")),
        "beta_5y_monthly": got.get("beta"),
        "pe_ttm": nq.pe_ttm(price, eps),
        "eps_ttm": eps,
        "earnings": got.get("earn"),
        "dividend_rate": fwd["rate"],
        "dividend_yield": fwd["yield"],
        "ex_dividend_date": fwd["ex_date"],
        "target_1y": nq.num(nq.val(summ, "OneYrTarget")),
        "market_status": status,
        "as_of": _now_iso(),
        "as_of_text": as_of_text,
        "trade_date": day,
        "trade_time": tm,
        "extended": _extended(info, status),
        "source": "Nasdaq, Tencent",
        "partial": fast,
    }
    if out["pe_ttm"] is not None and out["pe_ttm"] < 1:
        # Nasdaq reports EPS per share of the company's first class (BRK.B shows 53,762 = a Class A share's
        # earnings): against another class's price it gives a P/E of 0.01, so neither figure is shown
        out["eps_ttm"] = out["pe_ttm"] = None
    if out["asset_class"] == "etf":      # an ETF has no earnings, EPS or P/E, whatever the helpers say
        out["earnings"] = out["eps_ttm"] = out["pe_ttm"] = None
    return out


@router.get("/{symbol}/live")
def live(symbol: str, fast: bool = Query(False)):
    sym = _symbol(symbol)
    if not fast:
        note_view(sym)                                 # one page opening = one fast + one full request
    if fast:
        # the complete answer when it is already cached, else the quick one (never waits on the slow figures)
        full = nq.peek(f"qs_live_{sym}", nq.live_ttl() + 300)
        if full is not None:
            return full
        return nq.cached(f"qs_live_fast_{sym}", nq.live_ttl(), lambda: build_live(sym, fast=True), stale=300)
    return nq.cached(f"qs_live_{sym}", nq.live_ttl(), lambda: build_live(sym), stale=300)


# ── chart ─────────────────────────────────────────────────────────────────────

_TENCENT_URL = "https://web.ifzq.gtimg.cn/appstock/app/dayus/query"
_FALLBACK_SUFFIX = {}


def _suffix_map() -> dict:
    """The learned ticker -> exchange suffix map shared with routers/us_stocks (so a suffix found by the
    history chart is reused here); a private map when that module cannot be imported."""
    try:
        from routers.us_stocks import _TENCENT_SUFFIX
        return _TENCENT_SUFFIX
    except Exception:
        return _FALLBACK_SUFFIX


def _suffix_order(sym: str, exchange: str) -> list:
    known = _suffix_map().get(sym)
    if known:
        return [known]
    ex = (exchange or "").upper()
    first = ".OQ" if ex.startswith("NASDAQ") else ".N" if ex.startswith("NYSE") and "AMERICAN" not in ex else ".AM"
    return [first] + [s for s in (".OQ", ".N", ".AM") if s != first]


def parse_minute_feed(payload: dict) -> list:
    """Tencent dayus answer -> [{date, prev_close, points: [[ms, price], ...]}] oldest day first."""
    data = (payload or {}).get("data")
    if not isinstance(data, dict) or not data:
        return []
    node = next(iter(data.values()))
    days = []
    for d in (node or {}).get("data") or []:
        try:
            iso = f"{d['date'][:4]}-{d['date'][4:6]}-{d['date'][6:8]}"
            y, mo, dd = int(d["date"][:4]), int(d["date"][4:6]), int(d["date"][6:8])
        except (KeyError, ValueError, TypeError):
            continue
        pts = []
        for row in d.get("data") or []:
            parts = row.split()
            if len(parts) < 2:
                continue
            try:
                hh, mm, price = int(parts[0][:2]), int(parts[0][2:4]), float(parts[1])
            except ValueError:
                continue
            ms = int(datetime(y, mo, dd, hh, mm, tzinfo=nq.ET).timestamp() * 1000)
            pts.append([ms, price])
        if pts:
            days.append({"date": iso, "prev_close": nq.num(d.get("prec")), "points": pts})
    days.sort(key=lambda x: x["date"])
    return days


def _tencent_days(sym: str, exchange: str) -> list:
    def fetch():
        for suf in _suffix_order(sym, exchange):
            try:
                r = requests.get(_TENCENT_URL, params={"code": f"us{sym}{suf}"}, timeout=8)
                days = parse_minute_feed(r.json())
            except Exception as exc:
                log.debug("tencent minute %s%s failed: %s", sym, suf, exc)
                continue
            if days:
                _suffix_map()[sym] = suf
                return days
        return []
    return nq.cached(f"qs_min_{sym}", 60, fetch) or []


def _month_back(iso: str, months: int) -> str:
    d = date.fromisoformat(iso)
    y, m = divmod(d.year * 12 + d.month - 1 - months, 12)
    m += 1
    last = (date(y + (m == 12), m % 12 + 1, 1) - timedelta(days=1)).day
    return date(y, m, min(d.day, last)).isoformat()


def range_start(rng: str, latest: str) -> str:
    """First calendar day of a daily-based range; its base is the close on or before that day (YTD: the last
    close of the previous year)."""
    if rng == "ytd":
        return f"{int(latest[:4]) - 1}-12-31"
    return _month_back(latest, {"1m": 1, "6m": 6, "1y": 12, "5y": 60, "10y": 120}[rng])


def base_bar(rows: list, start: str, tolerance_days: int = 7):
    """The bar a range is measured from: the last bar on or before `start`. When history begins after `start`
    (a younger stock) the first bar counts only within a week of it; otherwise None, never a guess."""
    if not rows:
        return None
    b = nq.close_on_or_before(rows, start)
    if b:
        return b
    first = rows[0]
    return first if (date.fromisoformat(first["date"]) - date.fromisoformat(start)).days <= tolerance_days else None


def _close_ms(iso: str) -> int:
    y, m, d = map(int, iso.split("-"))
    return int(datetime(y, m, d, 16, 0, tzinfo=nq.ET).timestamp() * 1000)


def _weekly(rows: list) -> list:
    """Last bar of each ISO week (rows oldest first)."""
    out = {}
    for r in rows:
        y, w, _ = date.fromisoformat(r["date"]).isocalendar()
        out[(y, w)] = r
    return [out[k] for k in sorted(out)]


def info_open(info) -> bool:
    return _status(info.get("marketStatus")) == "open"


def _live_price(sym: str):
    info = nq.info(sym) or {}
    reg, _ = nq.regular_and_extended(info)          # ranges measure the regular session, not after hours
    day, _, _ = _stamp(reg.get("lastTradeTimestamp"))
    return nq.num(reg.get("lastSalePrice")), nq.num(reg.get("percentageChange")), day, info


def _five_day_base(prior: list, tdays: list, latest: str):
    """Close before the first of the last five sessions (Tencent's own prior close; daily bars if the feed is down)."""
    last5 = [d for d in tdays if d["date"] <= latest][-5:]
    if len(last5) == 5 and last5[-1]["date"] == latest and last5[0]["prev_close"]:
        return last5[0]["prev_close"]
    # prior = completed sessions before the latest one; the latest is in progress or just closed
    return prior[-5]["close"] if len(prior) >= 5 else None


def build_ranges(sym: str, price, pct_1d, latest, prior, tdays) -> dict:
    out = {"1d": pct_1d}
    out["5d"] = nq.pct_change(price, _five_day_base(prior, tdays, latest))
    for rng in ("1m", "6m", "ytd", "1y", "5y", "10y"):
        b = base_bar(prior, range_start(rng, latest))
        out[rng] = nq.pct_change(price, b["close"]) if b else None
    return out


def _prior_bars(sym: str, latest: str) -> list:
    """Completed sessions before the latest trade date (today's bar, if Nasdaq already has it, is replaced by
    the live price so the line ends exactly on the header price)."""
    return [r for r in nq.daily_history(sym) if r["date"] < latest]


def _downsample_5m(days: list) -> list:
    pts = []
    for d in days:
        rows = d["points"]
        keep = [p for p in rows if (p[0] // 60000) % 5 == 0]
        if rows and (not keep or keep[-1][0] != rows[-1][0]):
            keep.append(rows[-1])
        pts.extend(keep)
    return pts


def build_chart(sym: str, rng: str):
    price, pct_1d, last_day, info = _live_price(sym)
    if price is None:
        return None
    exchange = info.get("exchange") or ""
    tdays = _tencent_days(sym, exchange)
    latest = last_day or (tdays[-1]["date"] if tdays else None) or (nq.daily_history(sym) or [{}])[-1].get("date")
    if not latest:
        return None
    prior = _prior_bars(sym, latest)
    ranges = build_ranges(sym, price, pct_1d, latest, prior, tdays)
    out = {"symbol": sym, "range": rng, "interval": "1d", "points": [], "prev_close": None, "session": None,
           "change": None, "change_pct": ranges.get(rng), "ranges": ranges, "as_of": _now_iso(),
           "source": "Nasdaq, Tencent"}
    if rng == "1d":
        day = next((d for d in reversed(tdays) if d["date"] == latest), tdays[-1] if tdays else None)
        if not day:
            return out
        pts = [list(p) for p in day["points"]]
        close_ms = _close_ms(day["date"])
        now_ms = int(time.time() * 1000)
        if day["date"] == latest and pts[-1][0] < min(now_ms, close_ms) and info_open(info):
            pts.append([min(now_ms, close_ms), price])      # the feed lags a few minutes: end on the header price
        gap = (pts[1][0] - pts[0][0]) // 60000 if len(pts) > 1 else 5
        out.update(interval="1m" if gap <= 1 else "5m", points=pts, prev_close=day["prev_close"],
                   session={"open_ms": close_ms - 390 * 60000, "close_ms": close_ms})
        base = day["prev_close"]
        out["change_pct"] = pct_1d
        out["change"] = round(price - base, 4) if base else None
    elif rng == "5d":
        days = [d for d in tdays if d["date"] <= latest][-5:]
        out.update(interval="5m", points=_downsample_5m(days))
        base = _five_day_base(prior, tdays, latest)
        out["change"] = round(price - base, 4) if base else None
    else:
        b = base_bar(prior, range_start(rng, latest))
        if not b:
            return out
        bars = [r for r in prior if r["date"] >= b["date"]]
        if rng in ("5y", "10y"):
            bars = _weekly(bars)
            out["interval"] = "1wk"
        pts = [[_close_ms(r["date"]), r["close"]] for r in bars]
        pts.append([min(int(time.time() * 1000), _close_ms(latest)), price])
        out["points"] = pts
        out["change"] = round(price - b["close"], 4)
    return out


@router.get("/{symbol}/chart")
def chart(symbol: str, range: str = Query("1d")):
    sym = _symbol(symbol)
    rng = range.lower()
    if rng not in RANGES:
        raise HTTPException(status_code=400, detail="Unknown range")
    ttl = 60 if rng in ("1d", "5d") else 600
    res = nq.cached(f"qs_chart_{sym}_{rng}", ttl, lambda: _only_if_drawn(build_chart(sym, rng)))
    return res or {"symbol": sym, "range": rng, "interval": None, "points": [], "prev_close": None,
                   "session": None, "change": None, "change_pct": None, "ranges": {}, "as_of": _now_iso(),
                   "source": "Nasdaq, Tencent"}


def _only_if_drawn(payload):
    """An answer without a line is not worth keeping: the next request tries the sources again."""
    return payload if payload and payload["points"] else None


# ── performance vs the S&P 500 ────────────────────────────────────────────────

def performance_rows(stock: list, bench: list) -> tuple:
    """Price change of the stock and of SPY over YTD, 1, 3 and 5 years up to the last session both have.
    Returns (rows, as_of date). A period the stock's history does not cover is null for the stock."""
    if not stock or not bench:
        return [], None
    last = min(stock[-1]["date"], bench[-1]["date"])
    s_end, b_end = nq.close_on_or_before(stock, last), nq.close_on_or_before(bench, last)
    rows = []
    for key, start in (("ytd", f"{int(last[:4]) - 1}-12-31"), ("1y", _month_back(last, 12)),
                       ("3y", _month_back(last, 36)), ("5y", _month_back(last, 60))):
        sb, bb = base_bar(stock, start), base_bar(bench, start)
        rows.append({"key": key,
                     "stock": nq.pct_change(s_end["close"], sb["close"]) if sb and s_end else None,
                     "benchmark": nq.pct_change(b_end["close"], bb["close"]) if bb and b_end else None})
    return rows, last


@router.get("/{symbol}/performance")
def performance(symbol: str):
    sym = _symbol(symbol)

    def build():
        rows, as_of = performance_rows(nq.daily_history(sym), nq.daily_history(nq.BENCHMARK))
        if not rows:
            return None
        return {"symbol": sym, "benchmark": {"symbol": nq.BENCHMARK, "name": "S&P 500"}, "basis": "price",
                "as_of": as_of, "rows": rows, "source": "Nasdaq"}
    res = nq.cached(f"qs_perf_{sym}", 3600, build)
    return res or {"symbol": sym, "benchmark": {"symbol": nq.BENCHMARK, "name": "S&P 500"}, "basis": "price",
                   "as_of": None, "rows": [], "source": "Nasdaq"}


# ── peers ─────────────────────────────────────────────────────────────────────

def pick_peers(universe: list, sym: str, limit: int = 6) -> tuple:
    """(basis, group, rows): same industry when at least 3 others share it, else the sector; nearest market cap
    first by log distance. ([] when the ticker is not a listed common stock, e.g. an ETF.)"""
    me = next((r for r in universe if r["symbol"] == sym), None)
    if not me or not me.get("market_cap"):
        return None, None, []
    for basis in ("industry", "sector"):
        group = me.get(basis)
        if not group:
            continue
        pool = [r for r in universe if r.get(basis) == group and r["symbol"] != sym and r.get("market_cap")]
        if len(pool) >= 3 or basis == "sector":
            pool.sort(key=lambda r: abs(math.log(r["market_cap"] / me["market_cap"])))
            return basis, group, pool[:limit]
    return None, None, []


@router.get("/{symbol}/peers")
def peers(symbol: str):
    sym = _symbol(symbol)
    from routers import screener
    basis, group, rows = pick_peers(screener._universe(), sym)
    return {
        "symbol": sym, "basis": basis, "group": group,
        "peers": [{"symbol": r["symbol"], "name": r["name"], "price": r["price"], "change_pct": round(r["change_pct"], 2) if r["change_pct"] is not None else None,
                   "market_cap": r["market_cap"], "pe": r.get("pe")} for r in rows],
        "as_of": _now_iso(), "source": "Nasdaq, Tencent",
    }


# ── text (for the iOS app) ────────────────────────────────────────────────────

_TEXT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist", "quote-text.json")
_text_cache = {"mtime": 0.0, "data": None}


@router.get("/text")
def quote_text(lang: str = Query("en")):
    """Every string of the quote pages and the events calendar in one language, with the glossary: the website's
    own wording, exported by frontend/tools/quote_text.mjs at each build, so the iOS app says the same thing."""
    try:
        mtime = os.path.getmtime(_TEXT_PATH)
        if mtime != _text_cache["mtime"]:
            with open(_TEXT_PATH, encoding="utf-8") as f:
                _text_cache["data"] = json.load(f)
            _text_cache["mtime"] = mtime
    except (OSError, ValueError):
        raise HTTPException(status_code=503, detail="Quote text not built yet")
    langs = (_text_cache["data"] or {}).get("langs") or {}
    body = langs.get(lang) or langs.get("en")
    if not body:
        raise HTTPException(status_code=503, detail="Quote text not built yet")
    return {"lang": lang if lang in langs else "en", "generated": _text_cache["data"].get("generated"), **body}


# ── warm-up ───────────────────────────────────────────────────────────────────

_VIEWS_PATH = os.path.join(nq._CACHE_DIR, "quote_views.json")
_views = {}                                          # ticker -> pages opened (kept on disk, so a restart keeps it)
_views_lock = threading.Lock()
_views_saved = [0.0]


def note_view(sym: str) -> None:
    """Count one page view of `sym`; the warm-up caches the most opened tickers first. Saved at most once a minute."""
    with _views_lock:
        if not _views:
            try:
                with open(_VIEWS_PATH, encoding="utf-8") as f:
                    _views.update(json.load(f))
            except (OSError, ValueError):
                pass
        _views[sym] = _views.get(sym, 0) + 1
        if time.time() - _views_saved[0] < 60:
            return
        _views_saved[0] = time.time()
        snapshot = dict(_views)
    try:
        os.makedirs(os.path.dirname(_VIEWS_PATH), exist_ok=True)
        tmp = _VIEWS_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(snapshot, f)
        os.replace(tmp, _VIEWS_PATH)
    except OSError as exc:
        log.debug("could not save quote views: %s", exc)


def _most_viewed(limit: int = 150) -> list:
    with _views_lock:
        if not _views:
            try:
                with open(_VIEWS_PATH, encoding="utf-8") as f:
                    _views.update(json.load(f))
            except (OSError, ValueError):
                pass
        ranked = sorted(_views.items(), key=lambda kv: -kv[1])
    return [k for k, _ in ranked[:limit]]


def _sp500() -> list:
    try:
        with open(os.path.join(os.path.dirname(__file__), "..", "data", "us_gics_sectors.json"), encoding="utf-8") as f:
            return sorted(json.load(f).get("sectors") or {})
    except (OSError, ValueError):
        return []


def _largest(limit: int = 300) -> list:
    """The largest listed companies by market cap (covers the Nasdaq 100 and beyond)."""
    try:
        from routers import screener
        rows = [r for r in screener._universe() if r.get("market_cap")]
        rows.sort(key=lambda r: -r["market_cap"])
        return [r["symbol"] for r in rows[:limit]]
    except Exception as exc:
        log.debug("largest companies unavailable: %s", exc)
        return []


def warm_tickers() -> list:
    """The tickers most pages lead to, most important first: what visitors actually open, the S&P 500 fund and
    the mega caps, the movers universe, then the whole S&P 500 and the 300 largest companies."""
    from routers.us_market import MEGA_CAPS, US_UNIVERSE
    return list(dict.fromkeys([*_most_viewed(), "SPY", *MEGA_CAPS, *US_UNIVERSE, *_sp500(), *_largest()]))


def warmup(pause: float = 2.0, cycle_hours: float = 6.0) -> None:
    """Fill the slow shared caches (ten years of prices, splits and dividends, quarterly results) for the most
    viewed tickers, one at a time in the background, so a first visit to their quote page does not wait ~10 s
    on Nasdaq and Tencent. Runs every `cycle_hours`; the disk copies make a restart instant. Blocks: call it
    from a worker thread."""
    time.sleep(30)                                  # let the server finish starting first
    while True:
        started = time.time()
        for sym in warm_tickers():
            try:
                nq.daily_history(sym)
                nq.quarterly_results(sym)
                nq.dividends(sym)                   # also fetches the splits (Tencent notes)
            except Exception as exc:                # one bad ticker must not stop the loop
                log.debug("warm-up %s failed: %s", sym, exc)
            time.sleep(pause)
        log.info("quote warm-up: %d tickers in %.0fs", len(warm_tickers()), time.time() - started)
        time.sleep(cycle_hours * 3600)

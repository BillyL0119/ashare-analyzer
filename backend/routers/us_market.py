"""
US market data — /api/us/market/*

Free, fast data from qt.gtimg.cn (one batched request per call) so the site and apps can lead with US stocks
without a paid market-data plan:

  GET /overview            indices, session state, movers (gainers / losers / most active), sector ETFs, mega-caps
  GET /quotes?symbols=...  batch quotes (max 40)
  GET /search?q=...        ticker / company search with live price and English names
"""

import logging
import re
import threading
import time
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import requests
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
logger = logging.getLogger("us_market")

_ET = ZoneInfo("America/New_York")
_SYMBOL_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{0,9}$")

# ── Universe used for movers (large, liquid names; English company names come from the quote feed) ──────────
US_UNIVERSE = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "JPM", "LLY", "V", "UNH", "XOM", "MA", "JNJ",
    "PG", "HD", "COST", "ABBV", "AMD", "NFLX", "CRM", "BAC", "ORCL", "WMT", "MRK", "CVX", "KO", "PEP", "ADBE",
    "QCOM", "TXN", "INTC", "MU", "TSM", "BABA", "PDD", "JD", "BIDU", "ARM", "PLTR", "UBER", "DIS", "NKE", "MCD",
    "CSCO", "IBM", "GE", "CAT", "BA", "GS", "MS", "WFC", "C", "AXP", "PYPL", "SHOP", "SNOW", "COIN", "SOFI",
    "RIVN", "NIO", "LCID", "F", "GM", "T", "VZ", "PFE", "AMGN", "GILD", "LMT", "RTX", "HON", "LOW", "TMO", "DHR",
    "ABT", "MDT", "INTU", "NOW", "AMAT", "LRCX", "KLAC", "ADI", "MRVL", "PANW", "CRWD", "ZS", "DDOG", "NET", "MDB",
    "ROKU", "SPOT", "ABNB", "DASH", "SNAP", "PINS", "RBLX", "HOOD", "DKNG", "MSTR", "SMCI", "DELL", "ANET", "ASML",
    "NVO", "TM", "SONY", "SAP", "SHEL", "BP", "MRNA", "REGN", "VRTX", "ISRG", "BKNG", "SBUX", "TGT", "LULU", "CMG",
]
MEGA_CAPS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"]
SECTOR_ETFS = [
    ("XLK", "Technology"), ("XLF", "Financials"), ("XLE", "Energy"), ("XLV", "Health Care"),
    ("XLY", "Consumer Discretionary"), ("XLP", "Consumer Staples"), ("XLI", "Industrials"),
    ("XLU", "Utilities"), ("XLB", "Materials"), ("XLRE", "Real Estate"), ("XLC", "Communication"),
]
INDEX_CODES = [("usINX", "S&P 500", "标普500"), ("usIXIC", "Nasdaq", "纳斯达克"), ("usDJI", "Dow Jones", "道琼斯")]
INDEX_ETFS = [("IWM", "Russell 2000", "罗素2000")]  # small-cap proxy

# ── NYSE calendar ─────────────────────────────────────────────────────────────


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date:
    d = date(year, month, 1)
    d += timedelta(days=(weekday - d.weekday()) % 7)
    return d + timedelta(weeks=n - 1)


def _last_weekday(year: int, month: int, weekday: int) -> date:
    d = date(year, month + 1, 1) - timedelta(days=1) if month < 12 else date(year, 12, 31)
    return d - timedelta(days=(d.weekday() - weekday) % 7)


def _easter(year: int) -> date:
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = (h + l - 7 * m + 114) % 31 + 1
    return date(year, month, day)


def _observed(d: date) -> date | None:
    """Saturday holidays are observed on Friday, Sunday on Monday (New Year's on a Saturday is not observed)."""
    if d.weekday() == 5:
        return d - timedelta(days=1)
    if d.weekday() == 6:
        return d + timedelta(days=1)
    return d


def nyse_holidays(year: int) -> set:
    h = set()
    ny = date(year, 1, 1)
    if ny.weekday() != 5:
        h.add(_observed(ny))
    h.add(_nth_weekday(year, 1, 0, 3))
    h.add(_nth_weekday(year, 2, 0, 3))
    h.add(_easter(year) - timedelta(days=2))
    h.add(_last_weekday(year, 5, 0))
    h.add(_observed(date(year, 6, 19)))
    h.add(_observed(date(year, 7, 4)))
    h.add(_nth_weekday(year, 9, 0, 1))
    h.add(_nth_weekday(year, 11, 3, 4))
    h.add(_observed(date(year, 12, 25)))
    return h


def _is_trading_day(d: date) -> bool:
    return d.weekday() < 5 and d not in nyse_holidays(d.year)


def _early_close(d: date) -> bool:
    if not _is_trading_day(d):
        return False
    thanksgiving = _nth_weekday(d.year, 11, 3, 4)
    return d == thanksgiving + timedelta(days=1) or (d.month == 12 and d.day == 24) or (d.month == 7 and d.day == 3)


def market_session(now: datetime | None = None) -> dict:
    """pre (04:00-09:30 ET) / regular / post (16:00-20:00 ET) / closed, plus the next regular open."""
    now = (now or datetime.now(timezone.utc)).astimezone(_ET)
    today = now.date()
    t = now.time()
    pre, op = datetime.combine(today, datetime.min.time(), _ET).replace(hour=4), now.replace(hour=9, minute=30, second=0, microsecond=0)
    close_h = 13 if _early_close(today) else 16
    cl = now.replace(hour=close_h, minute=0, second=0, microsecond=0)
    post_end = now.replace(hour=17 if close_h == 13 else 20, minute=0, second=0, microsecond=0)
    state = "closed"
    if _is_trading_day(today):
        if pre <= now < op:
            state = "pre"
        elif op <= now < cl:
            state = "regular"
        elif cl <= now < post_end:
            state = "post"
    # next regular open
    d = today
    nxt = None
    for _ in range(12):
        cand = datetime.combine(d, datetime.min.time(), _ET).replace(hour=9, minute=30)
        if _is_trading_day(d) and cand > now:
            nxt = cand
            break
        d += timedelta(days=1)
    return {
        "state": state,
        "et_time": now.strftime("%Y-%m-%d %H:%M"),
        "next_open_utc": nxt.astimezone(timezone.utc).isoformat() if nxt else None,
        "closes_early": _early_close(today),
    }


# ── Quote feed ────────────────────────────────────────────────────────────────

_cache: dict = {}
_lock = threading.Lock()


def _cached(key: str, ttl: float, fn):
    now = time.time()
    hit = _cache.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]
    value = fn()
    with _lock:
        _cache[key] = (time.time(), value)
        if len(_cache) > 400:
            for k in sorted(_cache, key=lambda k: _cache[k][0])[:100]:
                _cache.pop(k, None)
    return value


def _ttl() -> float:
    return 45 if market_session()["state"] in ("regular", "pre", "post") else 300


def _f(v, default=None):
    try:
        x = float(v)
        return x
    except (TypeError, ValueError):
        return default


def parse_quote(fields: list) -> dict | None:
    if len(fields) < 50 or not fields[3] or _f(fields[3]) in (None, 0.0):
        return None
    code = fields[2]
    if code.startswith("."):          # index codes such as ".INX" keep their dot
        sym = code
    else:                              # "AAPL.OQ" -> AAPL, "BRK.B.N" -> BRK.B
        parts = code.split(".")
        sym = parts[0] if len(parts) == 2 else ".".join(parts[:-1])
    price, prev = _f(fields[3]), _f(fields[4])
    return {
        "symbol": sym.upper(),
        "name": fields[46] or fields[1],
        "name_zh": fields[1],
        "price": price,
        "prev_close": prev,
        "open": _f(fields[5]),
        "high": _f(fields[33]),
        "low": _f(fields[34]),
        "change": _f(fields[31]),
        "pct": _f(fields[32]),
        "volume": _f(fields[36]) or _f(fields[6]),
        "amount": _f(fields[37]),
        "pe": _f(fields[39]),
        "market_cap": (_f(fields[44]) or 0) * 1e8 or None,
        "high52": _f(fields[48]),
        "low52": _f(fields[49]),
        "time": fields[30],
    }


def tencent_quotes(codes: list) -> dict:
    """codes are Tencent codes such as 'usAAPL' / 'usINX'. Returns {code: quote}."""
    out = {}
    for i in range(0, len(codes), 80):
        chunk = codes[i:i + 80]
        try:
            r = requests.get("https://qt.gtimg.cn/q=" + ",".join(chunk), timeout=7)
            text = r.content.decode("gbk", errors="ignore")
        except Exception as e:
            logger.warning("tencent quotes failed: %s", e)
            continue
        for line in text.split(";"):
            if "=" not in line:
                continue
            key, _, val = line.partition("=")
            code = key.strip().replace("v_", "")
            q = parse_quote(val.strip().strip('"').split("~"))
            if q:
                out[code] = q
    return out


def us_quotes(symbols: list) -> dict:
    """{SYMBOL: quote} for US tickers (also works for ETFs)."""
    codes = ["us" + s for s in symbols]
    raw = tencent_quotes(codes)
    return {s: raw["us" + s] for s in symbols if "us" + s in raw}


def _slim(q: dict) -> dict:
    return {k: q.get(k) for k in ("symbol", "name", "price", "change", "pct", "volume", "amount", "market_cap")}


# ── Endpoints ─────────────────────────────────────────────────────────────────


def _build_overview() -> dict:
    wanted = [c for c, *_ in INDEX_CODES] + ["us" + s for s, _, _ in INDEX_ETFS] + ["us" + s for s in US_UNIVERSE] \
        + ["us" + s for s, _ in SECTOR_ETFS]
    raw = tencent_quotes(list(dict.fromkeys(wanted)))

    indices = []
    for code, name, name_zh in INDEX_CODES:
        q = raw.get(code)
        if q:
            indices.append({"symbol": q["symbol"], "name": name, "name_zh": name_zh, "price": q["price"], "change": q["change"], "pct": q["pct"]})
    for sym, name, name_zh in INDEX_ETFS:
        q = raw.get("us" + sym)
        if q:
            indices.append({"symbol": sym, "name": name, "name_zh": name_zh, "price": q["price"], "change": q["change"], "pct": q["pct"]})

    stocks = [raw["us" + s] for s in US_UNIVERSE if "us" + s in raw and raw["us" + s]["pct"] is not None]
    liquid = [q for q in stocks if (q["price"] or 0) >= 5]
    gainers = sorted(liquid, key=lambda q: q["pct"], reverse=True)[:10]
    losers = sorted(liquid, key=lambda q: q["pct"])[:10]
    active_all = sorted(stocks, key=lambda q: q["amount"] or 0, reverse=True)[:20]
    active = active_all[:10]

    sectors = []
    for sym, name in SECTOR_ETFS:
        q = raw.get("us" + sym)
        if q and q["pct"] is not None:
            sectors.append({"symbol": sym, "name": name, "pct": q["pct"], "price": q["price"]})
    sectors.sort(key=lambda s: s["pct"], reverse=True)

    adv = sum(1 for q in stocks if q["pct"] > 0)
    dec = sum(1 for q in stocks if q["pct"] < 0)
    stamp = max((q["time"] for q in raw.values() if q.get("time")), default=None)
    return {
        "session": market_session(),
        "as_of": stamp,
        "indices": indices,
        "gainers": [_slim(q) for q in gainers],
        "losers": [_slim(q) for q in losers],
        "active": [_slim(q) for q in active],
        "active_20": [_slim(q) for q in active_all],
        "sectors": sectors,
        "mega_caps": [_slim(raw["us" + s]) for s in MEGA_CAPS if "us" + s in raw],
        "breadth": {"advancing": adv, "declining": dec, "sample": len(stocks)},
    }


@router.get("/overview")
def overview():
    data = _cached("overview", _ttl(), _build_overview)
    if not data["indices"]:
        raise HTTPException(status_code=503, detail="US market data temporarily unavailable")
    return {**data, "session": market_session()}  # session is cheap and must be live


@router.get("/quotes")
def quotes(symbols: str = Query(..., min_length=1, max_length=400)):
    syms = []
    for s in symbols.upper().split(","):
        s = s.strip()
        if s and _SYMBOL_RE.match(s) and s not in syms:
            syms.append(s)
    if not syms:
        raise HTTPException(status_code=400, detail="No valid symbols")
    syms = syms[:40]
    data = _cached("q:" + ",".join(sorted(syms)), _ttl(), lambda: us_quotes(syms))
    return {"quotes": [data[s] for s in syms if s in data]}


_SUFFIXES = {"oq", "n", "am", "ps", "ob", "pk", "ar", "us"}


def _search(q: str) -> list:
    r = requests.get("https://smartbox.gtimg.cn/s3/", params={"v": 2, "q": q, "t": "us"}, timeout=6)
    text = r.content.decode("utf-8", errors="ignore")
    m = re.search(r'v_hint="(.*)"', text)
    if not m or not m.group(1):
        return []
    body = m.group(1).encode("utf-8").decode("unicode_escape") if "\\u" in m.group(1) else m.group(1)
    syms = []
    for item in body.split("^"):
        parts = item.split("~")
        if len(parts) < 5 or parts[0] != "us" or parts[4] not in ("GP", "ETF"):
            continue
        code = parts[1].upper()
        base, _, suf = code.rpartition(".")
        sym = base if suf.lower() in _SUFFIXES and base else code
        if _SYMBOL_RE.match(sym) and sym not in syms:
            syms.append(sym)
    syms = syms[:8]
    live = us_quotes(syms) if syms else {}
    return [{"symbol": s, "name": live[s]["name"], "name_zh": live[s]["name_zh"], "price": live[s]["price"], "pct": live[s]["pct"]} for s in syms if s in live]


@router.get("/search")
def search(q: str = Query(..., min_length=1, max_length=40)):
    term = q.strip()
    if not term:
        return {"results": []}
    try:
        results = _cached("s:" + term.lower(), 120, lambda: _search(term))
    except Exception as e:
        logger.warning("us search failed: %s", e)
        results = []
    return {"results": results}

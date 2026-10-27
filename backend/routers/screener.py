"""
US stock screener — /api/us/screener

Universe: every US-listed common stock from Nasdaq's public screener feed (~7,000 rows: price,
day change, volume, market cap, sector, industry, country, IPO year), refreshed every 15 min.
Sectors are GICS (data/us_gics_sectors.json, the S&P 500 and large ADRs) with Nasdaq's sector,
renamed to the GICS word, for the rest; industries stay Nasdaq's. The US heatmap groups by the same.
Live layer: Nasdaq's bulk feed lags a trading day, so price, day change, volume and market cap
come from Tencent batch quotes (the same source as the stock pages), together with P/E and the
52-week range. Rebuilt in a background thread every 10 min while the US market is open, 30 min
otherwise (~20-40s per build; until the first one finishes the Nasdaq values are shown).

Filters, sorting and paging run in memory, so a query costs a few ms.
"""

import json
import logging
import os
import re
import threading
import time
from datetime import datetime
from typing import Optional

import requests
from fastapi import APIRouter, Query

router = APIRouter()
logger = logging.getLogger("screener")

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126 Safari/537.36",
    "Accept": "application/json",
}
_SYM_OK = re.compile(r"^[A-Z]{1,5}(\.[A-Z])?$")          # drops warrants/preferreds (ABR^D, XYZ/WS)
_NOT_COMMON = re.compile(r"\b(warrants?|rights?|units?|depositary shares? representing a fraction|preferred|notes? due|debentures?)\b", re.I)
_NAME_TAIL = re.compile(r"\s+(Class [A-C] )?(Common Stock|Ordinary Shares|American Depositary Shares|Common Shares|Capital Stock|Shares of Beneficial Interest)\b.*$", re.I)
_THE_TAIL = re.compile(r"^(.+?),?\s*\(The\)(.*)$")


def tidy_company_name(name: str) -> str:
    """Nasdaq files "Coca-Cola Company (The)"; people write "The Coca-Cola Company"."""
    name = (name or "").strip()
    m = _THE_TAIL.match(name)
    return f"The {m.group(1)}{m.group(2)}".strip() if m else name


_GICS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "us_gics_sectors.json")
# Nasdaq's sector words for the companies outside the GICS list, renamed to the GICS ones;
# "Technology" stays short so it fits a heatmap tile header
_SECTOR_NAMES = {"Information Technology": "Technology", "Finance": "Financials",
                 "Telecommunications": "Communication Services", "Basic Materials": "Materials",
                 "Miscellaneous": "Other"}


def _load_gics() -> dict:
    try:
        with open(_GICS_PATH, encoding="utf-8") as f:
            return json.load(f)["sectors"]
    except Exception as e:
        logger.warning(f"screener: no GICS sectors ({e})")
        return {}

_GICS = _load_gics()


def us_sector(symbol: str, nasdaq_sector: Optional[str]) -> Optional[str]:
    """GICS sector (tools/build_us_gics.py); Nasdaq's own puts Visa under Consumer Discretionary."""
    s = _GICS.get(symbol) or nasdaq_sector
    return _SECTOR_NAMES.get(s, s) if s else None

_UNIVERSE_TTL = 900
def _enrich_ttl() -> float:
    try:
        from routers.us_market import market_session
        return 600 if market_session()["state"] in ("regular", "pre", "post") else 1800
    except Exception:
        return 1800
_state = {"rows": [], "ts": 0.0, "enrich": {}, "enrich_ts": 0.0}
_lock = threading.Lock()
_enrich_running = threading.Event()

CAP_BUCKETS = {            # USD
    "mega": (200e9, None),
    "large": (10e9, 200e9),
    "mid": (2e9, 10e9),
    "small": (300e6, 2e9),
    "micro": (0, 300e6),
}


def _num(v):
    if v in (None, "", "NA", "N/A"):
        return None
    try:
        return float(str(v).replace("$", "").replace(",", "").replace("%", ""))
    except ValueError:
        return None


def _fetch_universe() -> list[dict]:
    r = requests.get("https://api.nasdaq.com/api/screener/stocks?tableonly=true&download=true",
                     headers=_HEADERS, timeout=30)
    rows = ((r.json() or {}).get("data") or {}).get("rows") or []
    out = []
    for x in rows:
        sym = (x.get("symbol") or "").strip().upper().replace("/", ".")
        name = (x.get("name") or "").strip()
        cap = _num(x.get("marketCap"))
        price = _num(x.get("lastsale"))
        if not _SYM_OK.match(sym) or not cap or not price or _NOT_COMMON.search(name):
            continue
        ipo = _num(x.get("ipoyear"))
        out.append({
            "symbol": sym,
            "name": tidy_company_name(_NAME_TAIL.sub("", name).strip(" ,.") or name),
            "price": price,
            "change_pct": _num(x.get("pctchange")),
            "volume": _num(x.get("volume")),
            "market_cap": cap,
            "sector": us_sector(sym, (x.get("sector") or "").strip() or None),
            "industry": (x.get("industry") or "").strip() or None,
            "country": (x.get("country") or "").strip() or None,
            "ipo_year": int(ipo) if ipo else None,
        })
    return out


def _enrich(rows: list[dict]) -> dict:
    """{symbol: live quote fields} for the whole universe via Tencent batch quotes."""
    from routers.us_market import tencent_quotes
    syms = [r["symbol"] for r in rows]
    out = {}
    for i in range(0, len(syms), 80):
        chunk = syms[i:i + 80]
        got = tencent_quotes(["us" + s for s in chunk])
        for s in chunk:
            q = got.get("us" + s)
            if q:
                pe = q.get("pe")
                out[s] = {"price": q.get("price"), "change_pct": q.get("pct"), "volume": q.get("volume"),
                          "market_cap": q.get("market_cap"),
                          "pe": pe if pe and 0 < pe < 2000 else None,
                          "high52": q.get("high52"), "low52": q.get("low52")}
    return out


def _run_enrich(rows):
    try:
        t0 = time.time()
        data = _enrich(rows)
        with _lock:
            _state["enrich"], _state["enrich_ts"] = data, time.time()
        logger.info("screener enrichment: %d symbols in %.1fs", len(data), time.time() - t0)
    except Exception as exc:
        logger.warning("screener enrichment failed: %s", exc)
    finally:
        _enrich_running.clear()


def _universe() -> list[dict]:
    now = time.time()
    if not _state["rows"] or now - _state["ts"] > _UNIVERSE_TTL:
        try:
            rows = _fetch_universe()
            if rows:
                with _lock:
                    _state["rows"], _state["ts"] = rows, now
        except Exception as exc:
            logger.warning("screener universe fetch failed: %s", exc)
    if _state["rows"] and now - _state["enrich_ts"] > _enrich_ttl() and not _enrich_running.is_set():
        _enrich_running.set()
        threading.Thread(target=_run_enrich, args=(list(_state["rows"]),), daemon=True, name="screener-enrich").start()
    enrich = _state["enrich"]
    merged = []
    for r in _state["rows"]:
        e = enrich.get(r["symbol"]) or {}
        price = e.get("price") or r["price"]
        hi = e.get("high52")
        merged.append({
            **r,
            "price": price,
            "change_pct": e["change_pct"] if e.get("change_pct") is not None else r["change_pct"],
            "volume": e.get("volume") or r["volume"],
            "market_cap": e.get("market_cap") or r["market_cap"],
            "pe": e.get("pe"),
            "high52": hi,
            "low52": e.get("low52"),
            "off_high_pct": round((price - hi) / hi * 100, 2) if hi and price else None,
        })
    return merged


def warmup():
    """Called at startup: load the universe and start the enrichment thread."""
    try:
        _universe()
    except Exception:
        pass


SORTABLE = {"market_cap", "change_pct", "volume", "price", "pe", "off_high_pct", "symbol", "ipo_year"}


@router.get("")
def screen(
    q: Optional[str] = Query(None, max_length=40, description="symbol or name contains"),
    sector: Optional[str] = None,
    industry: Optional[str] = None,
    cap: Optional[str] = Query(None, description="comma list of mega,large,mid,small,micro"),
    pe_min: Optional[float] = None,
    pe_max: Optional[float] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    change_min: Optional[float] = None,
    change_max: Optional[float] = None,
    volume_min: Optional[float] = None,
    near_high: Optional[float] = Query(None, ge=0, le=100, description="within N% of the 52-week high"),
    ipo_since: Optional[int] = None,
    us_only: bool = False,
    sort: str = "market_cap",
    order: str = "desc",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    rows = _universe()
    sectors: dict = {}
    for r in rows:
        if r["sector"]:
            sectors[r["sector"]] = sectors.get(r["sector"], 0) + 1

    caps = [c for c in (cap or "").split(",") if c in CAP_BUCKETS]
    ql = (q or "").strip().lower()

    def keep(r):
        if ql and ql not in r["symbol"].lower() and ql not in (r["name"] or "").lower():
            return False
        if sector and r["sector"] != sector:
            return False
        if industry and r["industry"] != industry:
            return False
        if caps and not any(lo <= r["market_cap"] and (hi is None or r["market_cap"] < hi) for lo, hi in (CAP_BUCKETS[c] for c in caps)):
            return False
        if us_only and r["country"] != "United States":
            return False
        if ipo_since and (r["ipo_year"] or 0) < ipo_since:
            return False
        for v, lo, hi in ((r["price"], price_min, price_max), (r["change_pct"], change_min, change_max)):
            if lo is not None and (v is None or v < lo):
                return False
            if hi is not None and (v is None or v > hi):
                return False
        if volume_min is not None and (r["volume"] or 0) < volume_min:
            return False
        if (pe_min is not None or pe_max is not None):
            if r["pe"] is None:
                return False
            if pe_min is not None and r["pe"] < pe_min:
                return False
            if pe_max is not None and r["pe"] > pe_max:
                return False
        if near_high is not None and (r["off_high_pct"] is None or r["off_high_pct"] < -near_high):
            return False
        return True

    hits = [r for r in rows if keep(r)]
    key = sort if sort in SORTABLE else "market_cap"
    rev = order != "asc"
    # rows without the sort value always go last, whatever the direction
    has = sorted((r for r in hits if r[key] is not None), key=lambda r: r[key], reverse=rev)
    hits = has + [r for r in hits if r[key] is None]

    industries: dict = {}
    if sector:
        for r in rows:
            if r["sector"] == sector and r["industry"]:
                industries[r["industry"]] = industries.get(r["industry"], 0) + 1

    return {
        "total": len(hits),
        "rows": hits[offset:offset + limit],
        "sectors": sorted(({"name": k, "count": v} for k, v in sectors.items()), key=lambda x: -x["count"]),
        "industries": sorted(({"name": k, "count": v} for k, v in industries.items()), key=lambda x: -x["count"]),
        "universe": len(rows),
        "enriched": len(_state["enrich"]),
        "updated": datetime.utcfromtimestamp(_state["ts"]).strftime("%Y-%m-%dT%H:%M:%SZ") if _state["ts"] else None,
        "source": "Nasdaq (company list, industries) · GICS (sectors) · Tencent (prices, P/E, 52-week range)",
    }

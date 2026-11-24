"""
The home page's top panel ("yesterday's market in one sentence + three months of the main index") for the markets
other than the US (the US panel reads /api/us/market/overview and SPY's history directly).

  GET /api/home/lesson?market=cn|hk|jp

One shape for all three:
  main      the market's headline index {name_zh, name_en, price, change_pct}
  indices   the market's indices for the small table
  history   ~3 months of the headline index's daily closes [{date, close}]
  movers    the two biggest gainers and two biggest losers among the market's popular names
  breadth   A-shares only: rising / falling / flat counts
  sector    A-shares only: the sector that moved most in the day's direction
Sources: A-share overview and hot list (routers.market / routers.stocks), HK/JP overview (routers.global_stocks),
index history from Tencent (上证指数 sh000001, 恒生指数 hkHSI) and FT (Nikkei 225). Cached 5 minutes per market.
"""
import logging
import threading
import time

import requests
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter()
_TTL = 300
_cache: dict = {}
_lock = threading.Lock()
_UA = {"User-Agent": "Mozilla/5.0"}
FT_NIKKEI = "576473"        # FT markets id of the Nikkei 225 index (n225:NIK)


def _tencent_index(code: str, n: int = 66) -> list:
    r = requests.get("https://web.ifzq.gtimg.cn/appstock/app/kline/kline", params={"param": f"{code},day,,,{n}"},
                     headers=_UA, timeout=8)
    rows = ((r.json().get("data") or {}).get(code) or {}).get("day") or []
    out = []
    for row in rows:
        try:
            out.append({"date": row[0], "close": float(row[2])})
        except (IndexError, TypeError, ValueError):
            continue
    return out


def _ft_index(xid: str, days: int = 95) -> list:
    body = {"days": days, "dataNormalized": False, "dataPeriod": "Day", "dataInterval": 1, "realtime": False,
            "yFormat": "0.###", "timeServiceFormat": "JSON", "returnDateType": "ISO8601",
            "elements": [{"Type": "price", "Symbol": xid}]}
    d = requests.post("https://markets.ft.com/data/chartapi/series", json=body, headers=_UA, timeout=12).json()
    dates = [s[:10] for s in d.get("Dates") or []]
    closes = []
    for el in d.get("Elements") or []:
        for comp in el.get("ComponentSeries") or []:
            if comp.get("Type") == "Close":
                closes = comp.get("Values") or []
    return [{"date": day, "close": c} for day, c in zip(dates, closes) if c is not None]


def pick_movers(rows: list, n: int = 2) -> list:
    """The n biggest gainers and n biggest losers (by change_pct), largest move first."""
    rows = [r for r in rows if r.get("pct") is not None]
    up = sorted([r for r in rows if r["pct"] > 0], key=lambda r: -r["pct"])[:n]
    down = sorted([r for r in rows if r["pct"] < 0], key=lambda r: r["pct"])[:n]
    return sorted(up + down, key=lambda r: -abs(r["pct"]))


def _endpoint(router_obj, path: str):
    return next(r.endpoint for r in router_obj.routes if getattr(r, "path", "").endswith(path))


def _cn():
    from routers.market import market_overview
    from routers.stocks import hot_stocks
    from routers.us_market import tencent_quotes as tq
    ov = market_overview() or {}
    pct = lambda x: round(float(x) * 100, 2) if x is not None else None    # noqa: E731  the overview keeps fractions
    names = (("shanghai_index", "上证指数", "SSE Composite"), ("shenzhen_index", "深证成指", "SZSE Component"),
             ("chinext_index", "创业板指", "ChiNext"))
    indices = [{"symbol": k, "name_zh": zh, "name_en": en, "price": (ov.get(k) or {}).get("value"),
                "change_pct": pct((ov.get(k) or {}).get("change_pct"))} for k, zh, en in names if isinstance(ov.get(k), dict)]
    hot = hot_stocks("cn") or []
    codes = [h["code"] for h in hot if h.get("code")]
    prefix = lambda c: ("sh" if c.startswith(("6", "9")) else "bj" if c.startswith(("4", "8")) else "sz") + c   # noqa: E731
    quotes = {}
    try:
        raw = tq([prefix(c) for c in codes])
        quotes = {k[2:]: v for k, v in raw.items()}
    except Exception as e:
        logger.debug("cn quotes failed: %s", e)
    movers = pick_movers([{"symbol": h["code"], "name": h.get("name"), "name_zh": h.get("name"),
                           "price": (quotes.get(h["code"]) or {}).get("price"),
                           "pct": (quotes.get(h["code"]) or {}).get("pct", h.get("change_pct"))} for h in hot])
    sectors = ov.get("sector_performance") or []
    main = indices[0] if indices else None
    up = (main or {}).get("change_pct") or 0
    sector = (sorted(sectors, key=lambda s: -s["change_pct"] if up >= 0 else s["change_pct"])[0] if sectors else None)
    return {"main": main, "indices": indices, "history": _tencent_index("sh000001"), "movers": movers,
            "breadth": {"advancing": ov.get("advance_count"), "declining": ov.get("decline_count"),
                        "flat": ov.get("flat_count")},
            "sector": sector}


def _intl(market: str):
    from routers.global_stocks import hk_router, jp_router
    ov = _endpoint(hk_router if market == "hk" else jp_router, "/overview")() or {}
    indices = [{"symbol": i["symbol"], "name_zh": i.get("name_zh"), "name_en": i.get("name_en"), "price": i.get("price"),
                "change_pct": i.get("change_pct")} for i in ov.get("indices") or []]
    movers = pick_movers([{"symbol": h["symbol"], "name": h.get("name_en") or h.get("name"), "name_zh": h.get("name_zh") or h.get("name"),
                           "price": h.get("price"), "pct": h.get("change_pct")} for h in ov.get("hot") or []])
    history = _tencent_index("hkHSI") if market == "hk" else _ft_index(FT_NIKKEI)
    return {"main": indices[0] if indices else None, "indices": indices, "history": history, "movers": movers}


@router.get("/lesson")
def lesson(market: str = Query(..., pattern="^(cn|hk|jp)$")):
    now = time.time()
    with _lock:
        hit = _cache.get(market)
        if hit and now - hit[0] < _TTL:
            return hit[1]
    try:
        data = _cn() if market == "cn" else _intl(market)
    except Exception as e:
        logger.warning("home lesson %s failed: %s", market, e)
        if hit:
            return hit[1]
        raise HTTPException(503, "market data is not available right now") from None
    if not data.get("main"):
        if hit:
            return hit[1]
        raise HTTPException(503, "market data is not available right now")
    data = {"market": market, "as_of": (data["history"] or [{}])[-1].get("date"), **data}
    with _lock:
        _cache[market] = (now, data)
    return data

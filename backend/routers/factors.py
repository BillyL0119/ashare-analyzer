"""
Factor lab, /api/us/factors: rank today's S&P 500 by momentum, low volatility and value, and back-test the two
rules that prices alone can test (momentum, low volatility) over ten years. The maths is in services/factors.py.

Prices come from the daily bars the quote pages already keep on disk (nothing is fetched here), so a ticker the
warm-up has not reached yet is simply missing: every answer says how many stocks it used.
"""

import json
import logging
import os

from fastapi import APIRouter, HTTPException, Query

from services import factors as fx
from services import nasdaq as nq

router = APIRouter()
log = logging.getLogger("factors")

MIN_UNIVERSE = 100          # fewer stocks than this and a ranking means little: answer "still warming up"


def _membership() -> dict:
    """data/sp500_membership.json (tools/build_sp500_history.py): {"members": {ticker: spans}, "last_change", ...}."""
    path = os.path.join(os.path.dirname(__file__), "..", "data", "sp500_membership.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _world() -> dict:
    """Dates, symbols and the total-return price matrix (dividends reinvested) of today's S&P 500 (plus large foreign
    listings), every past member since 2015 that has prices, and SPY, built from cached bars (kept 6 h)."""
    def build():
        from routers.quote_summary import _sp500
        today = _sp500()
        mem = _membership()
        members = mem.get("members") or {}
        histories = {"SPY": nq.cached_history("SPY")}
        divs = {"SPY": nq.cached_dividends("SPY")}
        for s in dict.fromkeys([*today, *members]):
            bars = nq.cached_history(s)
            if bars:
                histories[s] = bars
                divs[s] = nq.cached_dividends(s)
        dates, symbols, closes = fx.build_matrix(histories, dividends=divs)
        if not dates or len(symbols) < MIN_UNIVERSE:
            return None
        today_set = set(today)
        past = [t for t in members if t not in today_set and not any(e is None for _, e in members[t])
                and max(e for _, e in members[t]) > dates[0]]        # left the index during the price window
        col = {s: j for j, s in enumerate(symbols)}

        def priced_while_member(t):                 # a reused ticker's prices start after the old company left
            j = col.get(t)
            return j is not None and any(fx.is_member(members[t], d) and closes[i, j] == closes[i, j]
                                         for i, d in enumerate(dates))
        return {"dates": dates, "symbols": symbols, "closes": closes, "universe": len(today),
                "used": sum(1 for s in symbols if s in today_set), "today": today_set, "members": members,
                "member_source": mem.get("source"), "last_change": mem.get("last_change"),
                "past_members": len(past), "past_priced": sum(1 for t in past if priced_while_member(t))}
    return nq.cached("factors_world2", 6 * 3600, build)


def _need_world() -> dict:
    w = _world()
    if not w:
        raise HTTPException(status_code=503, detail="Factor data is still warming up. Try again in a few minutes.")
    return w


def _coverage(w: dict) -> dict:
    return {"universe": w["universe"], "used": w["used"], "as_of": w["dates"][-1],
            "first_date": w["dates"][0]}


def _run(w: dict, factor: str, top: int, cost_bps: float, universe: str) -> dict:
    """One back-test, cached. universe "pit": the S&P 500 members of each rebalance day; "today": today's list."""
    def go():
        if universe == "today":
            keep = [0] + [j for j, s in enumerate(w["symbols"]) if s in w["today"]]
            syms = [w["symbols"][j] for j in keep]
            return fx.backtest(w["dates"], syms, w["closes"][:, keep], factor, top / 100, cost_bps)
        return fx.backtest(w["dates"], w["symbols"], w["closes"], factor, top / 100, cost_bps, members=w["members"])
    return nq.cached(f"factors_bt2_{factor}_{top}_{cost_bps}_{universe}", 6 * 3600, go)


@router.get("/backtest")
def backtest(factor: str = Query("momentum"), top: int = Query(20, ge=5, le=50), cost_bps: float = Query(10, ge=0, le=100),
             universe: str = Query("pit", pattern="^(pit|today)$")):
    if factor not in fx.FACTORS:
        raise HTTPException(status_code=400, detail="factor must be one of: " + ", ".join(fx.FACTORS))
    w = _need_world()
    if universe == "pit" and not w["members"]:
        universe = "today"                          # membership file missing: fall back, and say so
    res = _run(w, factor, top, cost_bps, universe)
    if not res or res.get("error"):
        raise HTTPException(status_code=503, detail=(res or {}).get("error") or "back-test failed")
    out = {**res, "universe": universe, "coverage": _coverage(w),
           "caveats": ["survivorship" if universe == "today" else "delisted_missing", "flat_costs", "past_not_future"]}
    if universe == "pit":
        # the same rule on today's members only: how much survivorship bias flatters it
        other = _run(w, factor, top, cost_bps, "today")
        if other and not other.get("error"):
            out["survivor_view"] = {k: other["stats"][k] for k in ("top", "all")}
            out["survivor_view"]["start"] = other["start"]
        out["membership"] = {"source": w["member_source"], "last_change": w["last_change"],
                             "past_members": w["past_members"], "past_priced": w["past_priced"]}
    return out


def _parse_weights(text: str) -> dict:
    out = {}
    for part in (text or "").split(","):
        name, _, val = part.partition(":")
        name = name.strip()
        if name in ("momentum", "low_vol", "value"):
            try:
                out[name] = max(0.0, min(10.0, float(val or 1)))
            except ValueError:
                pass
    return out


@router.get("/rank")
def rank(weights: str = Query("momentum:1,low_vol:1,value:1"), limit: int = Query(25, ge=5, le=100)):
    w = _need_world()
    weights_d = {k: v for k, v in _parse_weights(weights).items() if v > 0}
    if not weights_d:
        raise HTTPException(status_code=400, detail="choose at least one factor with a weight above zero")
    extra, meta = {}, {}
    try:
        from routers import screener
        rows = screener._universe()
        extra["value"] = {r["symbol"]: 1.0 / r["pe"] for r in rows if r.get("pe") and r["pe"] > 0}
        meta = {r["symbol"]: r for r in rows}
    except Exception as exc:                        # the screener feed is optional: value is then unavailable
        log.warning("screener universe unavailable for the value factor: %s", exc)
    if "value" in weights_d and not extra.get("value"):
        raise HTTPException(status_code=503, detail="Earnings figures for the value factor are not available right now.")
    keep = [0] + [j for j, s in enumerate(w["symbols"]) if s in w["today"]]       # today's list only
    rows = fx.rank_today(w["dates"], [w["symbols"][j] for j in keep], w["closes"][:, keep], weights_d, extra, limit)
    for r in rows:
        m = meta.get(r["symbol"]) or {}
        r["name"] = m.get("name")
        r["sector"] = m.get("sector")
        r["change_pct"] = round(m["change_pct"], 2) if m.get("change_pct") is not None else None
    return {"weights": weights_d, "rows": rows, "coverage": _coverage(w),
            "value_note": "value is ranked as of today only; it is not back-tested" if "value" in weights_d else None}

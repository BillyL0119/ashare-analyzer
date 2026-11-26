"""
Admin research desk: serves the file research/signals.py builds on Billy's Mac and tools/quant_publish.py uploads.

  /api/admin/quant/signals  GET  admin only: trend state, large-cap factor ranking, walk-forward record; the split
                                 trend rule's check-day decisions are read live from SPY's closes

The numbers derive from Sharadar data under a personal licence, so the route sits behind services.auth.require_admin
(checked on every request) and the response is never cached by a browser or proxy.
"""
import json
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from services import auth

quant_router = APIRouter()
health_router = APIRouter()         # public, mounted at /api/health: only ages in days, nothing from the desk itself
SIGNALS = os.path.join(os.path.dirname(__file__), "..", "data", "quant", "signals.json")
_cache = {"mtime": None, "data": None}


def _load():
    try:
        mtime = os.path.getmtime(SIGNALS)
    except OSError:
        return None
    if _cache["mtime"] != mtime:
        with open(SIGNALS) as fh:
            _cache["data"] = json.load(fh)
        _cache["mtime"] = mtime
    return _cache["data"]


@quant_router.get("/signals")
def signals(_: dict = Depends(auth.require_admin)):
    data = _load()
    if data is None:
        raise HTTPException(404, "No research file has been published yet")
    split = (data.get("trend") or {}).get("split")
    if split:
        # today's reading of the split trend rule from SPY's closes (between weekly files)
        try:
            from services import nasdaq as nq
            from services.trend_split_live import live_status
            live = live_status(split, nq.daily_history("SPY"))
            data = {**data, "trend": {**data["trend"], "split": {**split, "live": live}}}
        except Exception:
            pass
    return JSONResponse(data, headers={"Cache-Control": "no-store"})


# ── AI 解读 (plain-language reading of the desk; explains, never advises) ──────────────────────────────────────
EXPLAIN = os.path.join(os.path.dirname(__file__), "..", "data", "quant", "explain.json")
_explain_lock = __import__("threading").Lock()


def _read_explain():
    try:
        with open(EXPLAIN, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


@quant_router.get("/explain")
def explain_cached(_: dict = Depends(auth.require_admin)):
    """The explanation for the file now published, if one was made (never calls the model)."""
    from services.quant_explain import cache_key
    data = _load()
    if data is None:
        raise HTTPException(404, "No research file has been published yet")
    hit = _read_explain().get(cache_key(data))
    return JSONResponse(hit or {"available": False}, headers={"Cache-Control": "no-store"})


@quant_router.post("/explain")
def explain_make(_: dict = Depends(auth.require_admin)):
    """Make the explanation for the published file (one model call, then kept until the next weekly file)."""
    from services.quant_explain import cache_key, generate
    data = _load()
    if data is None:
        raise HTTPException(404, "No research file has been published yet")
    key = cache_key(data)
    with _explain_lock:
        store = _read_explain()
        if key in store:
            return JSONResponse(store[key], headers={"Cache-Control": "no-store"})
    res = generate(data)
    if res is None:
        raise HTTPException(503, "The explanation could not be written right now. Try again later.")
    with _explain_lock:
        store = {key: res}                                   # only the current week's explanation is kept
        tmp = EXPLAIN + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(store, fh, ensure_ascii=False)
        os.replace(tmp, EXPLAIN)
    return JSONResponse(res, headers={"Cache-Control": "no-store"})


@health_router.get("/quant-freshness")
def quant_freshness():
    """How old the admin desk's files are, in days (None = never published). Read by the daily maintenance check
    (tools/maintenance_check.py) so a weekly update that silently stopped (Mac off, Sharadar subscription ended) is noticed
    from outside the Mac. Public on purpose: it carries no figures from the desk."""
    now = __import__("time").time()

    def age(path):
        try:
            return round((now - os.path.getmtime(path)) / 86400, 2)
        except OSError:
            return None
    return JSONResponse({"desk_age_days": age(SIGNALS), "live_record_age_days": age(os.path.join(os.path.dirname(SIGNALS), "live_state.json"))},
                        headers={"Cache-Control": "no-store"})

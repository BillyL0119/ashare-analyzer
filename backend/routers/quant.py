"""
Admin research desk: serves the file research/signals.py builds on Billy's Mac and tools/quant_publish.py uploads.

  /api/admin/quant/signals  GET  admin only: trend state, large-cap factor ranking, walk-forward record

The numbers derive from Sharadar data under a personal licence, so the route sits behind services.auth.require_admin
(checked on every request) and the response is never cached by a browser or proxy.
"""
import json
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from services import auth

quant_router = APIRouter()
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
    return JSONResponse(data, headers={"Cache-Control": "no-store"})

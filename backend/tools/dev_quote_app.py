"""
Local dev server for the quote pages (/api/us/quote/*) and the events calendar (/api/events/*).

It runs the new routers plus the US routers they read from, without the production startup warmers, and
forwards every other GET under /api to production (read only), so the rest of the site works in the Vite
preview. Writes (POST, PUT, ...) to anything it does not serve itself are refused: a dev machine must never
send orders, sign-ups or analytics to production.

    cd backend
    .venv/bin/uvicorn tools.dev_quote_app:app --port 8001          # any free port
    cd ../frontend
    API_TARGET=http://localhost:8001 npx vite --port 5173

The minimal venv (backend/.venv) has fastapi, uvicorn, requests, pandas, numpy, httpx, pytest and pyflakes;
routers that need akshare (news, A-share data) are served by production through the forwarder.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))     # backend/ (routers, services)

import httpx  # noqa: E402
from fastapi import FastAPI, Request, Response  # noqa: E402

from routers import (  # noqa: E402
    events_calendar, factors, fundamentals, quote_history, quote_holders, quote_stats, quote_summary, screener,
    us_market, us_stocks,
)

PROD = os.getenv("DEV_FORWARD_TO", "https://bestfriendstock.com")

app = FastAPI(title="bestfriendstock dev: quote pages")
app.include_router(us_stocks.router, prefix="/api/us")
app.include_router(us_market.router, prefix="/api/us/market")
app.include_router(fundamentals.router, prefix="/api/us/fundamentals")
app.include_router(screener.router, prefix="/api/us/screener")
app.include_router(quote_summary.router, prefix="/api/us/quote")
app.include_router(quote_stats.router, prefix="/api/us/quote")
app.include_router(quote_history.router, prefix="/api/us/quote")
app.include_router(quote_holders.router, prefix="/api/us/quote")
app.include_router(events_calendar.router, prefix="/api/events")
app.include_router(factors.router, prefix="/api/us/factors")

# Admin quant desk with the admin check stubbed out: only ever on a dev machine, which is the only place a fake
# session can reach it (production keeps services.auth.require_admin on every request).
from routers.quant import quant_router  # noqa: E402
from services import auth as _auth  # noqa: E402
app.include_router(quant_router, prefix="/api/admin/quant")
from routers.journal import journal_router  # noqa: E402
app.include_router(journal_router, prefix="/api/admin/journal")
app.dependency_overrides[_auth.require_admin] = lambda: {"email": "dev-admin@localhost"}

_client = httpx.AsyncClient(timeout=40, follow_redirects=False)
_PASS_HEADERS = ("accept", "accept-language", "user-agent")


@app.api_route("/api/{path:path}", methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"])
async def forward(path: str, request: Request):
    if request.method not in ("GET", "HEAD"):
        return Response(status_code=405, content="dev server: writes are not forwarded to production")
    headers = {k: v for k, v in request.headers.items() if k.lower() in _PASS_HEADERS}
    r = await _client.get(f"{PROD}/api/{path}", params=request.query_params, headers=headers)
    return Response(content=r.content, status_code=r.status_code, media_type=r.headers.get("content-type"))

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import stocks
from routers.indicators import router as indicators_router
from routers.simulation import router as simulation_router
from routers.watchlist import router as watchlist_router
from routers.financial import router as financial_router
from routers.us_stocks import router as us_stocks_router
from routers.similar import router as similar_router

app = FastAPI(
    title="Best Friend Ashare API",
    description="China A-share market data and technical analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(indicators_router, prefix="/api/indicators", tags=["indicators"])
app.include_router(simulation_router, prefix="/api/simulation", tags=["simulation"])
app.include_router(watchlist_router, prefix="/api/watchlist", tags=["watchlist"])
app.include_router(financial_router, prefix="/api/financial", tags=["financial"])
app.include_router(us_stocks_router, prefix="/api/us", tags=["us_stocks"])
app.include_router(similar_router, prefix="/api/similar", tags=["similar"])

# Serve pre-built Next.js static export if available, else old Vite dist
NEXT_OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend-next", "out")
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/favicon.svg")
    def favicon():
        return FileResponse(os.path.join(DIST_DIR, "favicon.svg"))

    @app.get("/icons.svg")
    def icons():
        return FileResponse(os.path.join(DIST_DIR, "icons.svg"))

    # SPA fallback — all non-API routes serve index.html
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

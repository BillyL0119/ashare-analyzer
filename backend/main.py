from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from routers import stocks
from routers.indicators import router as indicators_router
from routers.simulation import router as simulation_router
from routers.watchlist import router as watchlist_router
from routers.financial import router as financial_router
from routers.us_stocks import router as us_stocks_router
from routers.similar import router as similar_router
from routers.news import router as news_router
from routers.radar import router as radar_router
from routers.knowledge import router as knowledge_router
from routers.market import router as market_router
from routers.export import router as export_router
from routers.calendar import router as calendar_router
from routers.paper_trading import router as paper_router
from routers.analytics import router as analytics_router
from routers.study import router as study_router
from routers.earnings import router as earnings_router
from routers.ai_teacher import router as ai_teacher_router
from routers.score import router as score_router
from routers.backtest import router as backtest_router
from routers.universities import router as universities_router
from routers.comments import router as comments_router

app = FastAPI(
    title="Best Friend Ashare API",
    description="China A-share market data and technical analysis",
    version="1.0.0",
)


@app.on_event("startup")
async def preload_stock_list():
    """Preload the A-share stock list into cache so search fallback is ready."""
    import asyncio
    from services.stock_service import get_stock_list
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, get_stock_list)


@app.on_event("startup")
async def warmup_caches():
    """Pre-warm slow caches (sentiment) so first user request is fast."""
    import asyncio
    from routers.market import warmup_sentiment
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, warmup_sentiment)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/sitemap.xml", response_class=Response)
async def sitemap():
    content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bestfriendstock.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bestfriendstock.com/ai-teacher</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>"""
    return Response(content=content, media_type="application/xml")

@app.get("/robots.txt", response_class=Response)
async def robots():
    content = """User-agent: *
Allow: /
Sitemap: https://bestfriendstock.com/sitemap.xml"""
    return Response(content=content, media_type="text/plain")

app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(indicators_router, prefix="/api/indicators", tags=["indicators"])
app.include_router(simulation_router, prefix="/api/simulation", tags=["simulation"])
app.include_router(watchlist_router, prefix="/api/watchlist", tags=["watchlist"])
app.include_router(financial_router, prefix="/api/financial", tags=["financial"])
app.include_router(us_stocks_router, prefix="/api/us", tags=["us_stocks"])
app.include_router(similar_router, prefix="/api/similar", tags=["similar"])
app.include_router(news_router, prefix="/api/news", tags=["news"])
app.include_router(radar_router, prefix="/api/radar", tags=["radar"])
app.include_router(knowledge_router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(market_router, prefix="/api/market", tags=["market"])
app.include_router(export_router, prefix="/api/export", tags=["export"])
app.include_router(calendar_router, prefix="/api/calendar", tags=["calendar"])
app.include_router(paper_router, prefix="/api/paper", tags=["paper_trading"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(study_router, prefix="/api/study", tags=["study"])
app.include_router(earnings_router, prefix="/api/earnings", tags=["earnings"])
app.include_router(ai_teacher_router, prefix="/api/ai", tags=["ai_teacher"])
app.include_router(score_router, prefix="/api/stock/score", tags=["score"])
app.include_router(backtest_router, prefix="/api/stock/backtest", tags=["backtest"])
app.include_router(universities_router, prefix="/api/universities", tags=["universities"])
app.include_router(comments_router, prefix="/api/comments", tags=["comments"])

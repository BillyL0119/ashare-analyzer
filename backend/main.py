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
from routers.sectors import router as sectors_router
from routers.quotes import router as quotes_router

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
    from datetime import date
    today = date.today().isoformat()
    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bestfriendstock.com/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bestfriendstock.com/ai-teacher</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bestfriendstock.com/universities</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bestfriendstock.com/study</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://bestfriendstock.com/paper</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>"""
    return Response(content=content, media_type="application/xml")

@app.get("/robots.txt", response_class=Response)
async def robots():
    content = """User-agent: *
Allow: /
Sitemap: https://bestfriendstock.com/sitemap.xml"""
    return Response(content=content, media_type="text/plain")

@app.get("/bot-render", response_class=Response)
async def bot_render():
    """Full static HTML for search engine crawlers."""
    html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Best Friend Stock | 免费A股美股分析 · AI智能投资 · 模拟炒股 · 经济学学习</title>
  <meta name="description" content="专为学生设计的免费股票分析平台。支持A股、美股K线图、AI智能分析、模拟炒股（百万虚拟资金T+1）、A-Level/IB/AP/IGCSE经济学学习中心、全球商学院指南（QS前100）。" />
  <link rel="canonical" href="https://bestfriendstock.com/" />
</head>
<body style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:32px 24px;color:#1a1a2e;">
  <h1>Best Friend Stock - 免费A股美股分析平台</h1>
  <p><strong>Your Best Friend in the Market</strong> — 专为学生设计的股票分析和经济学学习平台，完全免费。由两名高中生 Billy 和 Frank 开发。</p>
  <p><a href="https://bestfriendstock.com">立即使用 bestfriendstock.com</a></p>

  <h2>核心功能</h2>
  <ul>
    <li><strong>A股和美股K线图分析</strong> — 支持MA均线、MACD、RSI、布林带、成交量等技术指标，实时行情</li>
    <li><strong>AI智能分析</strong> — 基于 Claude AI 一键生成投资洞察，分析技术面、基本面与市场情绪</li>
    <li><strong>新闻舆情分析</strong> — 实时中英文新闻 AI 情感评分，快速把握市场看法</li>
    <li><strong>相似走势分析</strong> — 找到走势高度相关的同行，判断行业性行情还是个股独立行情</li>
    <li><strong>模拟炒股</strong> — 100万虚拟资金，T+1规则，真实手续费，练好再用真钱</li>
    <li><strong>蒙特卡洛模拟</strong> — 基于历史波动率模拟股价未来走势区间</li>
    <li><strong>策略回测</strong> — 对自定义交易策略进行历史数据回测，量化评估</li>
    <li><strong>全球市场情绪地图</strong> — 实时全球股指涨跌热力地图，美股/A股恐慌贪婪指数</li>
    <li><strong>板块轮动分析</strong> — 实时板块资金流向，A股热门板块追踪</li>
    <li><strong>财报日历</strong> — 美股财报日历，A股分红派息日历，重要事件提醒</li>
    <li><strong>股票打分</strong> — 多维度量化评分体系（技术面、基本面、情绪面综合打分）</li>
    <li><strong>收藏夹</strong> — 收藏关注的股票，实时显示涨跌</li>
  </ul>

  <h2>经济学学习中心</h2>
  <p>支持四大国际课程体系，结合真实A股/美股市场案例讲解经济学原理：</p>
  <ul>
    <li><strong>A-Level Economics</strong>（Cambridge 9708）— 微观经济学、宏观经济学全套考纲内容，真题解析</li>
    <li><strong>IB Economics SL/HL</strong> — 供需分析、市场失灵、国际贸易、发展经济学，IA写作指导</li>
    <li><strong>AP Macroeconomics &amp; Microeconomics</strong> — 美联储政策、GDP、CPI、IS-LM模型，FRQ专项训练</li>
    <li><strong>IGCSE Economics</strong> — 基础经济学概念、价格机制、生产成本、政府干预</li>
    <li><strong>AI经济学老师</strong> — 24小时在线，随时提问，实时解答经济学和金融知识</li>
    <li><strong>每日知识</strong> — 每天一个经济学概念，积少成多</li>
  </ul>

  <h2>全球商学院指南</h2>
  <p>收录90+所全球顶尖商学院，涵盖27个国家和地区，含QS排名、学费、课程、申请要求等详细信息：</p>
  <ul>
    <li><strong>美国</strong>：哈佛商学院（HBS）、沃顿商学院（Wharton）、斯坦福GSB、MIT斯隆、哥大商学院、芝加哥布斯、凯洛格、达顿、麦克唐纳等</li>
    <li><strong>英国</strong>：伦敦商学院（LBS）、牛津赛德商学院、剑桥Judge商学院、帝国理工、华威商学院</li>
    <li><strong>中国大陆</strong>：北大汇丰商学院、清华经管学院、上交大安泰经管、复旦管理学院、浙大管理学院</li>
    <li><strong>香港/亚洲</strong>：港大HKU、香港科大HKUST、香港中大CUHK、新加坡国大NUS、南洋理工NTU</li>
    <li><strong>欧洲</strong>：INSEAD、HEC Paris、IE Business School、博科尼大学、圣加仑大学、RSM鹿特丹</li>
    <li><strong>其他地区</strong>：澳大利亚、韩国、日本、印度IIM、中东等顶尖商学院</li>
  </ul>

  <h2>数据来源</h2>
  <p>AkShare · Yahoo Finance · Sina Finance · Polygon.io · 实时更新</p>

  <h2>免费 · 无需注册</h2>
  <p>完全免费使用，无需注册账号，无广告干扰。仅供学习研究用途，不构成投资建议。</p>

  <h2>快速导航</h2>
  <ul>
    <li><a href="https://bestfriendstock.com/">首页 - 股票行情分析</a></li>
    <li><a href="https://bestfriendstock.com/universities">全球商学院指南</a></li>
    <li><a href="https://bestfriendstock.com/ai-teacher">AI经济学老师</a></li>
    <li><a href="https://bestfriendstock.com/study">经济学学习中心</a></li>
    <li><a href="https://bestfriendstock.com/paper">模拟炒股</a></li>
  </ul>
</body>
</html>"""
    return Response(content=html, media_type="text/html; charset=utf-8")

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
app.include_router(sectors_router, prefix="/api/sectors", tags=["sectors"])
app.include_router(quotes_router, prefix="/api/quotes", tags=["quotes"])

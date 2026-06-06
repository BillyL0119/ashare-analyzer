"""
News sentiment router — /api/news/{symbol}

Fetch Chinese A-share news from multiple sources, run keyword-based sentiment
analysis instantly, then call Claude for deeper per-item analysis.
Results cached 30 min; AI results cached 2 hours.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import akshare as ak
import requests
import json
import re
import time
import logging
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger("news")
router = APIRouter()

# ── Caches ────────────────────────────────────────────────────────────────────
_result_cache: dict = {}   # symbol -> (ts, response_dict)
_ai_cache: dict = {}       # md5(title) -> (ts, ai_dict)
_name_cache: dict = {}     # code -> stock_name
_RESULT_TTL = 1800         # 30 min
_AI_TTL = 7200             # 2 hours

# ── Sentiment keywords ────────────────────────────────────────────────────────
_POS_KW = [
    "涨停", "业绩超预期", "利好", "增持", "回购", "突破", "创新高",
    "合作", "中标", "超预期", "大涨", "获批", "重大合同", "业绩增长",
    "分红", "高送转", "扭亏", "上调", "加仓", "战略合作",
]
_NEG_KW = [
    "跌停", "亏损", "利空", "减持", "调查", "违规", "退市风险",
    "下调", "业绩下滑", "暴跌", "处罚", "诉讼", "风险提示",
    "业绩预亏", "商誉减值", "被立案", "债务违约", "流动性危机",
]

SINA_HEADERS = {
    "Referer": "https://finance.sina.com.cn",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_stock_name(code: str) -> str:
    if code in _name_cache:
        return _name_cache[code]
    try:
        prefix = "sh" if code.startswith(("60", "68")) else "sz"
        r = requests.get(
            f"http://hq.sinajs.cn/list={prefix}{code}",
            headers=SINA_HEADERS, timeout=5,
        )
        text = r.text
        if '"' in text:
            name = text.split('"')[1].split(",")[0].strip()
            if name and len(name) > 1:
                _name_cache[code] = name
                return name
    except Exception:
        pass
    return code


def _keyword_sentiment(text: str) -> dict:
    pos = sum(1 for kw in _POS_KW if kw in text)
    neg = sum(1 for kw in _NEG_KW if kw in text)
    total = pos + neg
    if total == 0:
        return {"label": "neutral", "score": 0.0}
    score = round((pos - neg) / (pos + neg), 3)
    label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
    return {"label": label, "score": score}


def _ai_sentiment(title: str, content: str = "") -> dict:
    """Call Claude API for deep sentiment analysis. Cached per title (2h)."""
    cache_key = hashlib.md5(title.encode("utf-8", errors="ignore")).hexdigest()
    now = time.time()
    if cache_key in _ai_cache:
        ts, result = _ai_cache[cache_key]
        if now - ts < _AI_TTL:
            return result

    fallback = {"sentiment": "neutral", "impact": "low", "summary": "", "reason": ""}
    try:
        import anthropic
        client = anthropic.Anthropic()
        input_text = title
        if content:
            input_text += "\n" + content[:400]

        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=256,
            system=(
                "你是A股投资分析师。分析以下新闻对相关股票的影响，"
                "只返回合法JSON，不要任何其他文字：\n"
                '{"sentiment":"positive/neutral/negative",'
                '"impact":"high/medium/low",'
                '"summary":"一句话总结(15字以内)",'
                '"reason":"简短理由(25字以内)"}'
            ),
            messages=[{"role": "user", "content": input_text}],
        )
        raw = msg.content[0].text.strip()
        # Strip markdown code block if present
        if "```" in raw:
            raw = raw.split("```")[1].removeprefix("json").strip()
        result = json.loads(raw)
        for k in ("sentiment", "impact", "summary", "reason"):
            result.setdefault(k, "")
        # Sanitize enums
        if result.get("sentiment") not in ("positive", "neutral", "negative"):
            result["sentiment"] = "neutral"
        if result.get("impact") not in ("high", "medium", "low"):
            result["impact"] = "low"
    except Exception as exc:
        logger.debug("Claude sentiment failed for '%s': %s", title[:40], exc)
        result = fallback

    _ai_cache[cache_key] = (now, result)
    return result


def _ai_overall_summary(stock_name: str, headlines: list[str]) -> str:
    """Generate one-sentence overall sentiment summary via Claude."""
    try:
        import anthropic
        client = anthropic.Anthropic()
        joined = "\n".join(f"- {h}" for h in headlines[:10])
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=100,
            system="你是A股投资分析师，请用一句话总结以下新闻对该股票的整体舆情影响（30字以内）：",
            messages=[{"role": "user", "content": f"股票：{stock_name}\n新闻标题：\n{joined}"}],
        )
        return msg.content[0].text.strip()
    except Exception:
        return ""


# ── News source fetchers ──────────────────────────────────────────────────────

def _fetch_em_news(symbol: str) -> list[dict]:
    """东方财富 stock_news_em（主力中文来源）."""
    try:
        df = ak.stock_news_em(symbol=symbol)
        if df is None or df.empty:
            return []
        rows = []
        for _, row in df.head(20).iterrows():
            title = str(row.get("新闻标题", row.get("title", ""))).strip()
            if not title or title == "nan":
                continue
            rows.append({
                "title": title,
                "content": str(row.get("新闻内容", row.get("content", "")))[:500],
                "source": str(row.get("文章来源", "东方财富")).strip(),
                "time": str(row.get("发布时间", row.get("time", ""))).strip(),
                "url": str(row.get("新闻链接", row.get("url", ""))).strip(),
                "lang": "zh",
            })
        logger.info("stock_news_em returned %d items for %s", len(rows), symbol)
        return rows
    except Exception as exc:
        logger.warning("stock_news_em failed for %s: %s", symbol, exc)
        return []


def _fetch_cls_alerts(symbol: str) -> list[dict]:
    """财联社快讯（备用中文来源）."""
    try:
        df = ak.stock_zh_a_alerts_cls(symbol=symbol)
        if df is None or df.empty:
            return []
        rows = []
        for _, row in df.head(15).iterrows():
            title = str(row.get("标题", row.get("title", ""))).strip()
            if not title or title == "nan":
                continue
            rows.append({
                "title": title,
                "content": str(row.get("内容", ""))[:300],
                "source": "财联社",
                "time": str(row.get("时间", row.get("time", ""))).strip(),
                "url": str(row.get("链接", row.get("url", ""))).strip(),
                "lang": "zh",
            })
        logger.info("cls_alerts returned %d items for %s", len(rows), symbol)
        return rows
    except Exception as exc:
        logger.warning("stock_zh_a_alerts_cls failed for %s: %s", symbol, exc)
        return []


def _fetch_yahoo_rss(symbol: str) -> list[dict]:
    """Yahoo Finance RSS — English, best-effort."""
    suffix = ".SS" if symbol.startswith(("60", "68")) else ".SZ"
    ticker = symbol + suffix
    url = (
        f"https://feeds.finance.yahoo.com/rss/2.0/headline"
        f"?s={ticker}&region=US&lang=en-US"
    )
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code != 200:
            return []
        root = ET.fromstring(r.text)
        items = root.findall(".//item")
        rows = []
        for item in items[:8]:
            title = (item.findtext("title") or "").strip()
            if not title:
                continue
            rows.append({
                "title": title,
                "content": (item.findtext("description") or "")[:300].strip(),
                "source": "Yahoo Finance",
                "time": (item.findtext("pubDate") or "").strip(),
                "url": (item.findtext("link") or "").strip(),
                "lang": "en",
            })
        logger.info("Yahoo RSS returned %d items for %s", len(rows), symbol)
        return rows
    except Exception as exc:
        logger.debug("Yahoo RSS failed for %s: %s", symbol, exc)
        return []


# ── Global news sources & cache ───────────────────────────────────────────────

_global_cache: dict = {}   # 'global' -> (ts, data)
_GLOBAL_TTL = 1800         # 30 min

_RSS_SOURCES = [
    ('Reuters Business', 'https://feeds.reuters.com/reuters/businessNews', 'en'),
    ('Yahoo Finance',    'https://finance.yahoo.com/news/rssindex',        'en'),
    ('MarketWatch',      'https://feeds.marketwatch.com/marketwatch/topstories', 'en'),
    ('CNBC',             'https://www.cnbc.com/id/100003114/device/rss/rss.html', 'en'),
]

_CAT_KW = {
    'market':  ['stock', 'market', 'shares', 'equity', 'rally', 'selloff', 'index', 'dow', 'nasdaq',
                 's&p', '股市', '涨', '跌', '大盘', '沪深', '指数'],
    'economy': ['economy', 'gdp', 'inflation', 'fed', 'interest rate', 'jobs', 'unemployment',
                 'trade', 'tariff', '经济', 'gdp', '通胀', '美联储', '利率', '就业', '贸易'],
    'company': ['earnings', 'revenue', 'profit', 'ceo', 'merger', 'acquisition', 'ipo', 'quarterly',
                 '财报', '营收', '利润', '并购', '上市'],
    'crypto':  ['bitcoin', 'crypto', 'ethereum', 'blockchain', 'defi', 'nft', 'binance',
                 '比特币', '加密', '以太坊', '区块链'],
}


def _classify(text: str) -> str:
    low = text.lower()
    for cat, kws in _CAT_KW.items():
        if any(kw in low for kw in kws):
            return cat
    return 'market'


def _rss_time_to_iso(s: str) -> str:
    if not s:
        return datetime.utcnow().isoformat() + 'Z'
    try:
        import email.utils
        return email.utils.parsedate_to_datetime(s).isoformat()
    except Exception:
        return s


def _fetch_rss_source(name: str, url: str, lang: str, limit: int = 10) -> list[dict]:
    try:
        import feedparser
        feed = feedparser.parse(url)
        items = []
        for entry in feed.entries[:limit]:
            title = (entry.get('title') or '').strip()
            if not title:
                continue
            raw_summary = entry.get('summary') or entry.get('description') or ''
            summary = re.sub(r'<[^>]+>', '', raw_summary).strip()[:300]
            pub_iso = _rss_time_to_iso(entry.get('published') or entry.get('updated') or '')
            items.append({
                'title': title,
                'summary': summary,
                'source': name,
                'published_at': pub_iso,
                'url': (entry.get('link') or '').strip(),
                'lang': lang,
                'category': _classify(title + ' ' + summary),
            })
        return items
    except Exception as exc:
        logger.warning("RSS fetch failed [%s]: %s", name, exc)
        return []


def _fetch_sina_global(limit: int = 15) -> list[dict]:
    try:
        r = requests.get(
            'https://feed.mix.sina.com.cn/api/roll/get',
            params={'pageid': 153, 'lid': 2513, 'k': '', 'num': limit, 'page': 1},
            headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.sina.com.cn'},
            timeout=8,
        )
        data = r.json()
        items_raw = data.get('result', {}).get('data', [])
        result = []
        for item in items_raw:
            title = (item.get('title') or '').strip()
            if not title:
                continue
            mtime = item.get('mtime', '')
            try:
                pub_iso = datetime.fromtimestamp(int(mtime)).isoformat()
            except Exception:
                pub_iso = datetime.utcnow().isoformat()
            result.append({
                'title': title,
                'summary': (item.get('intro') or '')[:300],
                'source': '新浪财经',
                'published_at': pub_iso,
                'url': (item.get('url') or '').strip(),
                'lang': 'cn',
                'category': _classify(title),
            })
        return result
    except Exception as exc:
        logger.warning("Sina Finance fetch failed: %s", exc)
        return []


@router.get('/global')
def get_global_news(
    lang:     Optional[str] = Query('all', description='all / cn / en'),
    category: Optional[str] = Query('all', description='all / market / economy / company / crypto'),
):
    """Aggregate global financial news from RSS + Sina Finance. Cached 30 min."""
    now = time.time()
    ck = 'global'

    if ck not in _global_cache or now - _global_cache[ck][0] >= _GLOBAL_TTL:
        all_items: list[dict] = []
        with ThreadPoolExecutor(max_workers=6) as ex:
            futures = [ex.submit(_fetch_rss_source, name, url, lg) for name, url, lg in _RSS_SOURCES]
            futures.append(ex.submit(_fetch_sina_global, 15))
            for f in as_completed(futures):
                try:
                    all_items.extend(f.result())
                except Exception:
                    pass

        all_items.sort(key=lambda x: x.get('published_at', ''), reverse=True)
        payload = {
            'items': all_items,
            'total': len(all_items),
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            'sources': sorted({i['source'] for i in all_items}),
        }
        _global_cache[ck] = (now, payload)
    else:
        payload = _global_cache[ck][1]

    items = payload['items']
    if lang and lang != 'all':
        items = [i for i in items if i['lang'] == lang]
    if category and category != 'all':
        items = [i for i in items if i['category'] == category]

    return {**payload, 'items': items, 'count': len(items)}


# ── Route ─────────────────────────────────────────────────────────────────────

_POS_KW_EN = [
    "beat estimates", "record high", "strong growth", "raised guidance",
    "buyback", "dividend increase", "upgraded", "outperform", "exceeds",
    "record revenue", "profit surge", "partnership", "acquisition approved",
]
_NEG_KW_EN = [
    "missed estimates", "downgrade", "layoffs", "investigation", "recall",
    "guidance cut", "debt", "loss", "below expectations", "revenue miss",
    "regulatory probe", "underperform", "decline", "warning",
]


def _keyword_sentiment_en(text: str) -> dict:
    text_lower = text.lower()
    pos = sum(1 for kw in _POS_KW_EN if kw in text_lower)
    neg = sum(1 for kw in _NEG_KW_EN if kw in text_lower)
    total = pos + neg
    if total == 0:
        return {"label": "neutral", "score": 0.0}
    score = round((pos - neg) / (pos + neg), 3)
    label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
    return {"label": label, "score": score}


def _fetch_yahoo_rss_us(symbol: str) -> list[dict]:
    """Yahoo Finance RSS for US-listed ticker (no suffix needed)."""
    url = (
        f"https://feeds.finance.yahoo.com/rss/2.0/headline"
        f"?s={symbol}&region=US&lang=en-US"
    )
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code != 200:
            return []
        root = ET.fromstring(r.text)
        items = root.findall(".//item")
        rows = []
        for item in items[:20]:
            title = (item.findtext("title") or "").strip()
            if not title:
                continue
            rows.append({
                "title": title,
                "content": (item.findtext("description") or "")[:300].strip(),
                "source": "Yahoo Finance",
                "time": (item.findtext("pubDate") or "").strip(),
                "url": (item.findtext("link") or "").strip(),
                "lang": "en",
            })
        return rows
    except Exception as exc:
        logger.debug("Yahoo RSS US failed for %s: %s", symbol, exc)
        return []


@router.get("/{symbol}")
def get_news(symbol: str, market: str = Query("cn")):
    """
    Return up to 20 recent news items with keyword + AI sentiment for `symbol`.
    Pass market=us to fetch English-only Yahoo Finance news for US stocks.
    Overall sentiment summary included. Cached 30 minutes.
    """
    try:
        now = time.time()
        cache_key = f"{symbol}_{market}"
        # Cache hit
        if cache_key in _result_cache:
            ts, cached = _result_cache[cache_key]
            if now - ts < _RESULT_TTL:
                logger.debug("Cache hit for news/%s market=%s", symbol, market)
                return cached

        # ── US market: English-only Yahoo Finance ──
        if market == "us":
            sym_upper = symbol.upper()
            news_raw = _fetch_yahoo_rss_us(sym_upper)
            stock_name = sym_upper

            if not news_raw:
                response = {
                    "symbol": sym_upper,
                    "stock_name": stock_name,
                    "news": [],
                    "overall": {
                        "positive_count": 0,
                        "neutral_count": 0,
                        "negative_count": 0,
                        "sentiment_score": 0.0,
                        "ai_summary": "No news data available.",
                    },
                }
                _result_cache[cache_key] = (now, response)
                return response

            processed = []
            for item in news_raw:
                kw = _keyword_sentiment_en(item["title"] + " " + item.get("content", ""))
                processed.append({
                    "title": item["title"],
                    "source": item["source"],
                    "time": item["time"],
                    "url": item["url"],
                    "lang": "en",
                    "keyword_sentiment": kw,
                    "ai_sentiment": {"sentiment": kw["label"], "reason": ""},
                    "final_sentiment": kw["label"],
                })

            pos = sum(1 for n in processed if n["final_sentiment"] == "positive")
            neu = sum(1 for n in processed if n["final_sentiment"] == "neutral")
            neg = sum(1 for n in processed if n["final_sentiment"] == "negative")
            total = len(processed)
            score = round((pos - neg) / total, 3) if total > 0 else 0.0

            ai_summary = _ai_overall_summary(stock_name, [n["title"] for n in processed])
            if not ai_summary:
                ai_summary = (
                    f"Overall sentiment is {'positive' if pos > neg else 'negative' if neg > pos else 'neutral'}. "
                    f"{total} articles found."
                )

            response = {
                "symbol": sym_upper,
                "stock_name": stock_name,
                "news": processed,
                "overall": {
                    "positive_count": pos,
                    "neutral_count": neu,
                    "negative_count": neg,
                    "sentiment_score": score,
                    "ai_summary": ai_summary,
                },
            }
            _result_cache[cache_key] = (now, response)
            return response

        # ── CN market (original logic) ──
        stock_name = _get_stock_name(symbol)

        # ── Fetch from sources ──
        news_raw = _fetch_em_news(symbol)
        if not news_raw:
            news_raw = _fetch_cls_alerts(symbol)

        # Append English (Yahoo RSS) always
        yahoo = _fetch_yahoo_rss(symbol)
        news_raw = (news_raw + yahoo)[:20]

        # ── Empty state ──
        if not news_raw:
            response = {
                "symbol": symbol,
                "stock_name": stock_name,
                "news": [],
                "overall": {
                    "positive_count": 0,
                    "neutral_count": 0,
                    "negative_count": 0,
                    "sentiment_score": 0.0,
                    "ai_summary": "暂无新闻数据",
                },
            }
            _result_cache[cache_key] = (now, response)
            return response

        # ── Per-item sentiment ──
        processed = []
        for item in news_raw:
            kw = _keyword_sentiment(item["title"] + " " + item.get("content", ""))
            ai = _ai_sentiment(item["title"], item.get("content", ""))
            final = (
                ai["sentiment"]
                if ai["sentiment"] in ("positive", "neutral", "negative")
                else kw["label"]
            )
            processed.append({
                "title": item["title"],
                "source": item["source"],
                "time": item["time"],
                "url": item["url"],
                "lang": item["lang"],
                "keyword_sentiment": kw,
                "ai_sentiment": ai,
                "final_sentiment": final,
            })

        # ── Overall stats ──
        pos = sum(1 for n in processed if n["final_sentiment"] == "positive")
        neu = sum(1 for n in processed if n["final_sentiment"] == "neutral")
        neg = sum(1 for n in processed if n["final_sentiment"] == "negative")
        total = len(processed)
        score = round((pos - neg) / total, 3) if total > 0 else 0.0

        ai_summary = _ai_overall_summary(
            stock_name, [n["title"] for n in processed]
        )
        if not ai_summary:
            if pos > neg:
                ai_summary = f"整体舆情偏正面，共{total}条新闻，正面{pos}条"
            elif neg > pos:
                ai_summary = f"整体舆情偏负面，共{total}条新闻，负面{neg}条"
            else:
                ai_summary = f"整体舆情中性，共{total}条新闻"

        response = {
            "symbol": symbol,
            "stock_name": stock_name,
            "news": processed,
            "overall": {
                "positive_count": pos,
                "neutral_count": neu,
                "negative_count": neg,
                "sentiment_score": score,
                "ai_summary": ai_summary,
            },
        }
        _result_cache[cache_key] = (now, response)
        logger.info(
            "News done for %s: %d items, pos=%d neu=%d neg=%d",
            symbol, total, pos, neu, neg,
        )
        return response

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("News route error for %s", symbol)
        raise HTTPException(status_code=500, detail=f"新闻获取失败：{exc}") from exc

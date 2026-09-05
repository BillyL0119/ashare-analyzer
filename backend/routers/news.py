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
    ('Reuters Business',  'https://feeds.reuters.com/reuters/businessNews',           'en'),
    ('Yahoo Finance',     'https://finance.yahoo.com/news/rssindex',                  'en'),
    ('MarketWatch',       'https://feeds.marketwatch.com/marketwatch/topstories',     'en'),
    ('CNBC',              'https://www.cnbc.com/id/100003114/device/rss/rss.html',    'en'),
    ('BBC Business',      'https://feeds.bbci.co.uk/news/business/rss.xml',           'en'),
    ('Guardian Business', 'https://www.theguardian.com/uk/business/rss',              'en'),
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


# ── Daily market news (A-share focused, richer Chinese sources) ───────────────

_daily_cache: dict = {}
_DAILY_TTL = 1200  # 20 min

# 5 categories for the daily page
_DAILY_CAT_KW = {
    'macro':    ['央行', '货币政策', '财政政策', '降准', '降息', '加息', 'gdp', 'cpi', 'ppi',
                 '宏观', '政策', '进出口', '汇率', '通胀', '就业', '财政',
                 'fed', 'interest rate', 'inflation', 'tariff', 'trade war'],
    'company':  ['营收', '利润', '财报', '并购', '重组', '增发', '回购', '分红', '高管',
                 '董事长', 'ceo', '任命', '公告', '业绩', '收购',
                 'earnings', 'revenue', 'profit', 'merger', 'acquisition', 'ipo'],
    'industry': ['行业', '板块', '芯片', '新能源', '医药', '房地产', '银行', '券商',
                 '汽车', '消费', '军工', '能源', '互联网', '半导体',
                 'sector', 'industry', 'tech', 'energy', 'semiconductor'],
    'breaking': ['突发', '紧急', '重大', '危机', '暴跌', '熔断', '违约', '制裁', '战争',
                 'breaking', 'urgent', 'crash', 'crisis', 'war', 'sanctions'],
}


def _classify_daily(text: str) -> str:
    low = text.lower()
    for cat, kws in _DAILY_CAT_KW.items():
        if any(kw in low for kw in kws):
            return cat
    return 'market'


def _fetch_cls_market() -> list[dict]:
    """财联社市场快讯（全市场，无需股票代码）."""
    try:
        r = requests.get(
            'https://www.cls.cn/nodeapi/updateTelegraph',
            params={'app': 'CLS', 'os': 'android', 'sv': '7.7.5',
                    'last_time': 0, 'rn': 20, 'cls_tag_id': 0},
            headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.cls.cn'},
            timeout=8,
        )
        data = r.json()
        items_raw = (data.get('data') or {}).get('telegraph_list') or []
        result = []
        for item in items_raw[:20]:
            title = (item.get('title') or item.get('brief') or '').strip()
            if not title:
                continue
            content = re.sub(r'<[^>]+>', '', item.get('content') or '').strip()[:300]
            pub_ts = item.get('ctime', 0)
            try:
                pub_iso = datetime.fromtimestamp(int(pub_ts)).isoformat()
            except Exception:
                pub_iso = datetime.utcnow().isoformat()
            result.append({
                'title': title,
                'summary': content,
                'source': '财联社',
                'published_at': pub_iso,
                'url': (item.get('share_url') or '').strip(),
                'lang': 'cn',
                'category': _classify_daily(title + ' ' + content),
            })
        logger.info("CLS market flash returned %d items", len(result))
        return result
    except Exception as exc:
        logger.warning("CLS market fetch failed: %s", exc)
        return []


def _fetch_em_market_flash() -> list[dict]:
    """东方财富市场快讯（全市场要闻）."""
    try:
        r = requests.get(
            'https://feed.mix.sina.com.cn/api/roll/get',
            params={'pageid': 153, 'lid': 2516, 'k': '', 'num': 20, 'page': 1},
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
                'source': '新浪财经要闻',
                'published_at': pub_iso,
                'url': (item.get('url') or '').strip(),
                'lang': 'cn',
                'category': _classify_daily(title),
            })
        logger.info("Sina market flash (lid=2516) returned %d items", len(result))
        return result
    except Exception as exc:
        logger.warning("Sina market flash fetch failed: %s", exc)
        return []


def _fetch_sina_cn_stock() -> list[dict]:
    """新浪财经 A股行情频道（lid=2514，与综合财经 lid=2513 内容不同）."""
    try:
        r = requests.get(
            'https://feed.mix.sina.com.cn/api/roll/get',
            params={'pageid': 153, 'lid': 2514, 'k': '', 'num': 20, 'page': 1},
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
                'source': '新浪A股',
                'published_at': pub_iso,
                'url': (item.get('url') or '').strip(),
                'lang': 'cn',
                'category': _classify_daily(title),
            })
        logger.info("Sina A股 (lid=2514) returned %d items", len(result))
        return result
    except Exception as exc:
        logger.warning("Sina A股 fetch failed: %s", exc)
        return []


def _fetch_eastmoney_market() -> list[dict]:
    """东方财富市场要闻（独立数据源）."""
    try:
        r = requests.get(
            'https://np-listapi.eastmoney.com/comm/web/getListInfo',
            params={
                'client': 'web', 'type': '1',
                'mTypeAndCode': '99|99',
                'pageSize': '20', 'pageIndex': '1',
            },
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.eastmoney.com',
                'Origin': 'https://www.eastmoney.com',
            },
            timeout=8,
        )
        data = r.json()
        items_raw = (data.get('data') or {}).get('list') or []
        result = []
        for item in items_raw:
            title = (item.get('title') or '').strip()
            if not title:
                continue
            content = re.sub(r'<[^>]+>', '', item.get('digest') or item.get('content') or '').strip()[:300]
            pub_str = item.get('showTime') or item.get('pub_date') or ''
            try:
                pub_iso = datetime.strptime(pub_str, '%Y-%m-%d %H:%M:%S').isoformat()
            except Exception:
                pub_iso = datetime.utcnow().isoformat()
            result.append({
                'title': title,
                'summary': content,
                'source': '东方财富',
                'published_at': pub_iso,
                'url': (item.get('url') or item.get('Art_Url') or '').strip(),
                'lang': 'cn',
                'category': _classify_daily(title + ' ' + content),
            })
        logger.info("Eastmoney market news returned %d items", len(result))
        return result
    except Exception as exc:
        logger.warning("Eastmoney market news fetch failed: %s", exc)
        return []


# ── Deduplication ─────────────────────────────────────────────────────────────

def _titles_similar(t1: str, t2: str, threshold: float = 0.55) -> bool:
    """
    Token-overlap similarity: true when two titles likely report the same event.
    Works for both Chinese (character n-grams) and English (words).
    """
    # Fast exact-prefix check first
    if t1[:25].lower() == t2[:25].lower():
        return True
    a = set(re.findall(r'[\w\u4e00-\u9fa5]{2,}', t1.lower()))
    b = set(re.findall(r'[\w\u4e00-\u9fa5]{2,}', t2.lower()))
    if not a or not b:
        return False
    return len(a & b) / min(len(a), len(b)) >= threshold


def _deduplicate_news(items: list[dict]) -> list[dict]:
    """
    Remove near-duplicate items.
    Keeps the first occurrence (highest-priority source after time-sort).
    O(n²) but fine for ~200 items.
    """
    kept: list[dict] = []
    for item in items:
        title = item['title']
        if not any(_titles_similar(title, k['title']) for k in kept):
            kept.append(item)
    return kept


@router.get('/daily')
def get_daily_market_news(
    lang:     Optional[str] = Query('all', description='all / cn / en'),
    category: Optional[str] = Query('all', description='all / market / macro / company / industry / breaking'),
):
    """
    Aggregate daily major market news from CLS flash, Sina Finance + RSS sources.
    Cached 20 min. Categories: market / macro / company / industry / breaking.
    """
    now = time.time()
    if 'daily' not in _daily_cache or now - _daily_cache['daily'][0] >= _DAILY_TTL:
        all_items: list[dict] = []
        with ThreadPoolExecutor(max_workers=12) as ex:
            futures = [ex.submit(_fetch_rss_source, name, url, lg) for name, url, lg in _RSS_SOURCES]
            futures.append(ex.submit(_fetch_sina_global, 20))
            futures.append(ex.submit(_fetch_sina_cn_stock))
            futures.append(ex.submit(_fetch_cls_market))
            futures.append(ex.submit(_fetch_em_market_flash))
            futures.append(ex.submit(_fetch_eastmoney_market))
            for f in as_completed(futures):
                try:
                    items = f.result()
                    # re-classify with daily categories
                    for item in items:
                        item['category'] = _classify_daily(
                            item.get('title', '') + ' ' + item.get('summary', '')
                        )
                    all_items.extend(items)
                except Exception:
                    pass

        # Sort by time first so we keep the earliest/canonical version on dedup
        all_items.sort(key=lambda x: x.get('published_at', ''), reverse=True)
        deduped = _deduplicate_news(all_items)

        payload = {
            'items': deduped,
            'total': len(deduped),
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            'sources': sorted({i['source'] for i in deduped}),
        }
        _daily_cache['daily'] = (now, payload)
    else:
        payload = _daily_cache['daily'][1]

    items = payload['items']
    if lang and lang != 'all':
        items = [i for i in items if i.get('lang') == lang]
    if category and category != 'all':
        items = [i for i in items if i.get('category') == category]

    return {**payload, 'items': items, 'count': len(items)}


# ── Bank views (investment bank opinion aggregator) ───────────────────────────
#
# Pulls from the same public RSS/API sources as daily news, then filters to
# articles that (a) mention a named investment bank AND (b) contain
# view/opinion/rating language.  No proprietary research platforms accessed.

_BANKS = [
    {'en': 'Goldman Sachs',   'zh': '高盛',       'kw': ['goldman sachs', 'goldman', '高盛']},
    {'en': 'JPMorgan',        'zh': '摩根大通',   'kw': ['jpmorgan', 'jp morgan', 'j.p. morgan', 'jamie dimon', '摩根大通']},
    {'en': 'Morgan Stanley',  'zh': '摩根士丹利', 'kw': ['morgan stanley', '摩根士丹利']},
    {'en': 'Bank of America', 'zh': '美银美林',   'kw': ['bank of america', 'bofa', 'merrill lynch', '美银']},
    {'en': 'Citi',            'zh': '花旗',       'kw': ['citigroup', 'citibank', '花旗']},
    {'en': 'UBS',             'zh': '瑞银',       'kw': ['ubs', '瑞银']},
    {'en': 'Barclays',        'zh': '巴克莱',     'kw': ['barclays', '巴克莱']},
    {'en': 'Deutsche Bank',   'zh': '德意志银行', 'kw': ['deutsche bank', '德意志银行']},
    {'en': 'HSBC',            'zh': '汇丰',       'kw': ['hsbc', '汇丰']},
    {'en': 'Nomura',          'zh': '野村',       'kw': ['nomura', '野村']},
    {'en': 'BlackRock',       'zh': '贝莱德',     'kw': ['blackrock', '贝莱德']},
    {'en': 'Wells Fargo',     'zh': '富国银行',   'kw': ['wells fargo', '富国银行']},
]

# Per-ticker Yahoo Finance RSS — bypasses the blocked generic yahoo/reuters domains
# News fetched for a bank's own ticker is by definition about that bank
_BANK_TICKERS = [
    {'en': 'Goldman Sachs',   'zh': '高盛',       'ticker': 'GS'},
    {'en': 'JPMorgan',        'zh': '摩根大通',   'ticker': 'JPM'},
    {'en': 'Morgan Stanley',  'zh': '摩根士丹利', 'ticker': 'MS'},
    {'en': 'Bank of America', 'zh': '美银美林',   'ticker': 'BAC'},
    {'en': 'Citi',            'zh': '花旗',       'ticker': 'C'},
    {'en': 'UBS',             'zh': '瑞银',       'ticker': 'UBS'},
    {'en': 'Barclays',        'zh': '巴克莱',     'ticker': 'BARC.L'},
    {'en': 'Deutsche Bank',   'zh': '德意志银行', 'ticker': 'DB'},
    {'en': 'HSBC',            'zh': '汇丰',       'ticker': 'HSBC'},
    {'en': 'Nomura',          'zh': '野村',       'ticker': 'NMR'},
    {'en': 'BlackRock',       'zh': '贝莱德',     'ticker': 'BLK'},
    {'en': 'Wells Fargo',     'zh': '富国银行',   'ticker': 'WFC'},
]

# Keywords that signal a view/opinion rather than a passing mention
_VIEW_KW = [
    'upgrade', 'downgrade', 'outperform', 'underperform',
    'overweight', 'underweight', 'buy rating', 'sell rating',
    'target price', 'price target', 'raises target', 'cuts target', 'lifts target',
    'bullish', 'bearish', 'sees ', 'forecasts', 'expects ', 'warns ',
    'recommends', 'outlook', 'strategy note', 'research note', 'earnings estimate',
    '评级', '目标价', '目标股价', '上调', '下调',
    '买入评级', '卖出评级', '增持', '减持', '看多', '看空',
    '预测', '展望', '认为', '预期',
]

_BANK_ACTION_KW = {
    'rating':   ['upgrade', 'downgrade', 'outperform', 'underperform',
                 'overweight', 'underweight', 'buy rating', 'sell rating',
                 '评级', '上调评级', '下调评级', '增持', '减持'],
    'target':   ['target price', 'price target', 'raises target', 'cuts target', 'lifts target',
                 '目标价', '目标股价', '上调目标', '下调目标'],
    'macro':    ['gdp', 'inflation', 'interest rate', 'fed', 'recession',
                 'growth forecast', 'earnings estimate',
                 '宏观', '通胀', '利率', '经济', '美联储'],
    'strategy': ['bullish', 'bearish', 'strategy', 'outlook', 'recommends', 'allocation',
                 '看多', '看空', '策略', '展望', '配置'],
}


def _fetch_bank_ticker_news(bank_en: str, bank_zh: str, ticker: str) -> list[dict]:
    """
    Fetch Yahoo Finance per-ticker RSS for one bank stock.
    Articles about the bank's own ticker are naturally about that bank's actions/views.
    This endpoint works even when the generic yahoo.com domain is blocked on the server.
    """
    url = (
        f'https://feeds.finance.yahoo.com/rss/2.0/headline'
        f'?s={ticker}&region=US&lang=en-US'
    )
    try:
        r = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code != 200:
            return []
        root = ET.fromstring(r.text)
        result = []
        for item in root.findall('.//item')[:15]:
            title = (item.findtext('title') or '').strip()
            if not title:
                continue
            pub_raw = (item.findtext('pubDate') or '').strip()
            try:
                import email.utils as _eu
                pub_iso = _eu.parsedate_to_datetime(pub_raw).isoformat()
            except Exception:
                pub_iso = datetime.utcnow().isoformat()
            search = title.lower()
            # Detect additional banks mentioned in title
            extra_en, extra_zh = _detect_banks(search)
            banks_en = list({bank_en} | set(extra_en))
            banks_zh = list({bank_zh} | set(extra_zh))
            result.append({
                'title':        title,
                'summary':      (item.findtext('description') or '')[:300].strip(),
                'source':       'Yahoo Finance',
                'published_at': pub_iso,
                'url':          (item.findtext('link') or '').strip(),
                'lang':         'en',
                'banks':        banks_en,
                'banks_zh':     banks_zh,
                'action_type':  _detect_bank_action(search),
            })
        logger.info("Bank ticker RSS [%s/%s]: %d items", ticker, bank_en, len(result))
        return result
    except Exception as exc:
        logger.warning("Bank ticker RSS failed [%s/%s]: %s", ticker, bank_en, exc)
        return []


def _detect_banks(text: str) -> tuple[list[str], list[str]]:
    """Return (names_en, names_zh) of investment banks mentioned in text."""
    low = text.lower()
    names_en: list[str] = []
    names_zh: list[str] = []
    for bank in _BANKS:
        for kw in bank['kw']:
            is_chinese = bool(re.search(r'[\u4e00-\u9fa5]', kw))
            found = (kw in low) if is_chinese else bool(re.search(r'\b' + re.escape(kw) + r'\b', low))
            if found:
                names_en.append(bank['en'])
                names_zh.append(bank['zh'])
                break
    return names_en, names_zh


def _detect_bank_action(text: str) -> str:
    low = text.lower()
    for action, kws in _BANK_ACTION_KW.items():
        if any(kw in low for kw in kws):
            return action
    return 'outlook'


_bank_views_cache: dict = {}
_BANK_VIEWS_TTL = 1200  # 20 min


@router.get('/bank-views')
def get_bank_views(bank: Optional[str] = Query('all')):
    """
    Aggregate investment bank view articles. Cached 20 min.

    Primary: per-ticker Yahoo Finance RSS for each major bank (GS, JPM, MS…).
    These work even when the generic yahoo.com RSS domain is blocked on the server.
    Secondary: existing RSS/Sina/Eastmoney pool filtered for bank+view keywords.
    No proprietary research platforms accessed.
    """
    now = time.time()
    if 'bv' not in _bank_views_cache or now - _bank_views_cache['bv'][0] >= _BANK_VIEWS_TTL:

        # ── Primary: per-ticker Yahoo Finance (reliable, bank-focused by design) ──
        ticker_items: list[dict] = []
        with ThreadPoolExecutor(max_workers=12) as ex:
            futs = [
                ex.submit(_fetch_bank_ticker_news, b['en'], b['zh'], b['ticker'])
                for b in _BANK_TICKERS
            ]
            for f in as_completed(futs):
                try:
                    ticker_items.extend(f.result())
                except Exception:
                    pass

        # ── Secondary: general pool filtered for bank + view keyword ──
        pool_raw: list[dict] = []
        with ThreadPoolExecutor(max_workers=10) as ex:
            futs2 = [ex.submit(_fetch_rss_source, name, url, lg) for name, url, lg in _RSS_SOURCES]
            futs2 += [
                ex.submit(_fetch_sina_global, 20),
                ex.submit(_fetch_em_market_flash),
                ex.submit(_fetch_eastmoney_market),
            ]
            for f in as_completed(futs2):
                try:
                    pool_raw.extend(f.result())
                except Exception:
                    pass

        pool_filtered: list[dict] = []
        for item in pool_raw:
            search = (item.get('title', '') + ' ' + item.get('summary', '')).lower()
            names_en, names_zh = _detect_banks(search)
            if not names_en:
                continue
            if not any(kw in search for kw in _VIEW_KW):
                continue
            entry = dict(item)
            entry['banks']       = names_en
            entry['banks_zh']    = names_zh
            entry['action_type'] = _detect_bank_action(search)
            pool_filtered.append(entry)

        all_items = ticker_items + pool_filtered
        all_items.sort(key=lambda x: x.get('published_at', ''), reverse=True)
        deduped = _deduplicate_news(all_items)
        all_banks = sorted({b for it in deduped for b in it.get('banks', [])})

        logger.info(
            "bank-views: ticker=%d pool_raw=%d pool_filtered=%d deduped=%d",
            len(ticker_items), len(pool_raw), len(pool_filtered), len(deduped),
        )
        payload = {
            'items':      deduped,
            'total':      len(deduped),
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            'banks':      all_banks,
        }
        _bank_views_cache['bv'] = (now, payload)
    else:
        payload = _bank_views_cache['bv'][1]

    items = payload['items']
    if bank and bank != 'all':
        items = [i for i in items if bank in i.get('banks', [])]

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

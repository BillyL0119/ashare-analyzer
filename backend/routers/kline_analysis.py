"""
K-line segment analysis — POST /api/analysis/kline-segment

Given a stock symbol + date range, returns:
  - Basic stats: period return, high/low, amplitude, vol change, volatility
  - Technical indicator summary (MACD / RSI / MA state at end of range)
  - News within the date range (EM for CN; Yahoo RSS best-effort for US)
  - AI interpretation: distinguishes news-backed from pure technical analysis

Supports both A-share (CN, via AkShare) and US stocks (via Polygon.io cache).
AI priority: Gemini (GEMINI_API_KEY) → DeepSeek (DEEPSEEK_API_KEY).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import logging
import math
import time
import numpy as np
import pandas as pd
from datetime import datetime

logger = logging.getLogger("kline_analysis")
router = APIRouter()

GEMINI_KEY   = os.environ.get("GEMINI_API_KEY", "")
_result_cache: dict = {}          # (symbol, market, start, end, lang) -> (ts, response)
_RESULT_TTL = 6 * 3600
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")


# ── Request model ─────────────────────────────────────────────────────────────

class SegmentRequest(BaseModel):
    symbol:     str
    start_date: str            # "YYYY-MM-DD"
    end_date:   str            # "YYYY-MM-DD"
    market:     str = "cn"
    stock_name: Optional[str] = ""
    lang:       str = "zh"         # zh | en | ja | ko | fr — language of every text field returned


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe(val, decimals: int = 2) -> float:
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return round(f, decimals)
    except Exception:
        return 0.0


_LANGS = ("zh", "en", "ja", "ko", "fr")

# Indicator wording per language. Keys are the states the helpers below detect.
_TXT = {
    "nodata":    {"zh": "数据不足", "en": "Not enough data", "ja": "データ不足", "ko": "데이터 부족", "fr": "Données insuffisantes"},
    "golden_up": {"zh": "金叉上扬，多头趋势增强", "en": "Golden cross, bullish momentum strengthening", "ja": "ゴールデンクロス、上昇の勢いが強まる", "ko": "골든크로스, 상승 모멘텀 강화", "fr": "Croisement haussier, dynamique haussière en hausse"},
    "dif_above": {"zh": "DIF在DEA上方，多头偏强", "en": "DIF above DEA, mildly bullish", "ja": "DIFがDEAの上、やや強気", "ko": "DIF가 DEA 위, 다소 강세", "fr": "DIF au-dessus de DEA, légèrement haussier"},
    "dead_down": {"zh": "死叉下行，空头趋势增强", "en": "Death cross, bearish momentum strengthening", "ja": "デッドクロス、下落の勢いが強まる", "ko": "데드크로스, 하락 모멘텀 강화", "fr": "Croisement baissier, dynamique baissière en hausse"},
    "dif_below": {"zh": "DIF在DEA下方，空头偏弱", "en": "DIF below DEA, mildly bearish", "ja": "DIFがDEAの下、やや弱気", "ko": "DIF가 DEA 아래, 다소 약세", "fr": "DIF sous DEA, légèrement baissier"},
    "rsi_ob2":   {"zh": "严重超买", "en": "strongly overbought", "ja": "強い買われ過ぎ", "ko": "강한 과매수", "fr": "fortement suracheté"},
    "rsi_ob":    {"zh": "超买区间", "en": "overbought", "ja": "買われ過ぎ", "ko": "과매수", "fr": "suracheté"},
    "rsi_os2":   {"zh": "严重超卖", "en": "strongly oversold", "ja": "強い売られ過ぎ", "ko": "강한 과매도", "fr": "fortement survendu"},
    "rsi_os":    {"zh": "超卖区间", "en": "oversold", "ja": "売られ過ぎ", "ko": "과매도", "fr": "survendu"},
    "rsi_mid":   {"zh": "中性区间", "en": "neutral", "ja": "中立", "ko": "중립", "fr": "neutre"},
    "above":     {"zh": "上方", "en": "above", "ja": "上", "ko": "위", "fr": "au-dessus de"},
    "below":     {"zh": "下方", "en": "below", "ja": "下", "ko": "아래", "fr": "sous"},
}


def _t(key: str, lang: str) -> str:
    return _TXT[key].get(lang) or _TXT[key]["en"]


def _macd_state(macd_data: list, lang: str = "zh") -> str:
    if len(macd_data) < 2:
        return _t("nodata", lang)
    last = macd_data[-1]
    prev = macd_data[-2]
    dif    = last.get("dif")  or 0
    dea    = last.get("dea")  or 0
    hist   = last.get("macd") or 0
    prev_h = prev.get("macd") or 0
    if dif > dea:
        if hist > 0 and hist >= prev_h:
            return _t("golden_up", lang)
        return _t("dif_above", lang)
    if hist < 0 and hist <= prev_h:
        return _t("dead_down", lang)
    return _t("dif_below", lang)


def _rsi_state(rsi_data: list, lang: str = "zh") -> str:
    if not rsi_data:
        return _t("nodata", lang)
    rsi6 = rsi_data[-1].get("rsi6") or 50
    key = ("rsi_ob2" if rsi6 >= 80 else "rsi_ob" if rsi6 >= 70 else
           "rsi_os2" if rsi6 <= 20 else "rsi_os" if rsi6 <= 30 else "rsi_mid")
    sep = "，" if lang == "zh" else ", "
    return f"RSI6={rsi6:.1f}{sep}{_t(key, lang)}"


def _ma_state(ma_data: list, last_close: float, lang: str = "zh") -> str:
    if not ma_data:
        return _t("nodata", lang)
    last = ma_data[-1]
    parts = []
    for key, label in [("ma5", "MA5"), ("ma10", "MA10"), ("ma20", "MA20")]:
        val = last.get(key)
        if not val:
            continue
        rel = _t("above" if last_close > val else "below", lang)
        if lang == "zh":
            parts.append(f"收盘{last_close:.2f}在{label}({val:.2f}){rel}")
        elif lang == "ja":
            parts.append(f"終値{last_close:.2f}は{label}({val:.2f})の{rel}")
        elif lang == "ko":
            parts.append(f"종가 {last_close:.2f}, {label}({val:.2f}) {rel}")
        elif lang == "fr":
            parts.append(f"Clôture {last_close:.2f} {rel} la {label} ({val:.2f})")
        else:
            parts.append(f"Close {last_close:.2f} {rel} {label} ({val:.2f})")
    return ("；" if lang == "zh" else "; ").join(parts[:2]) if parts else _t("nodata", lang)


# ── Data fetching ─────────────────────────────────────────────────────────────

def _get_us_all_candles(symbol: str) -> list:
    """
    Return up to 365 days of daily candles for a US symbol via Polygon.io.
    Reuses the same disk cache used by the /api/us/* routes — no extra API calls
    if the user has already viewed this stock's chart.
    """
    try:
        from routers.us_stocks import _fetch_history_candles
        return _fetch_history_candles(symbol, 365)
    except Exception as exc:
        logger.warning("US candle fetch failed for %s: %s", symbol, exc)
        return []


def _candles_to_df(candles: list) -> pd.DataFrame:
    """Convert a list of OHLCV candle dicts to a DataFrame expected by indicator_service."""
    if not candles:
        return pd.DataFrame()
    return pd.DataFrame(candles)


# ── News fetching ─────────────────────────────────────────────────────────────

def _fetch_news_cn(symbol: str, start_date: str, end_date: str) -> list:
    """East Money news filtered to date range. CN stocks only."""
    try:
        import akshare as ak
        df = ak.stock_news_em(symbol=symbol)
        if df is None or df.empty:
            return []
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end   = datetime.strptime(end_date,   "%Y-%m-%d")
        result = []
        for _, row in df.iterrows():
            time_str = str(row.get("发布时间", "")).strip()
            if not time_str or time_str == "nan":
                continue
            try:
                pub = datetime.strptime(time_str[:10], "%Y-%m-%d")
            except ValueError:
                continue
            if start <= pub <= end:
                title  = str(row.get("新闻标题", "")).strip()
                source = str(row.get("文章来源", "东方财富")).strip()
                if title and title != "nan":
                    result.append({"title": title, "source": source, "date": time_str[:10]})
        return result[:10]
    except Exception as exc:
        logger.warning("CN news fetch failed for %s: %s", symbol, exc)
        return []


def _fetch_news_us(symbol: str, start_date: str, end_date: str) -> list:
    """Headlines about this ticker inside the range, from the news tab's Yahoo + Nasdaq feed
    (relevance filtered). Both feeds only reach back a few weeks, so older ranges get []
    and the AI falls back to a technical-only reading."""
    import email.utils
    try:
        from routers.news import _us_symbol_news
        items, _ = _us_symbol_news(symbol, want=40)
    except Exception as exc:
        logger.debug("US news failed for %s: %s", symbol, exc)
        return []
    result = []
    for it in items:
        try:
            day = email.utils.parsedate_to_datetime(it.get("time", "")).strftime("%Y-%m-%d")
        except Exception:
            continue
        if start_date <= day <= end_date and it.get("title"):
            result.append({"title": it["title"], "source": it.get("source") or "News", "date": day})
    result.sort(key=lambda x: x["date"], reverse=True)
    return result[:10]


# ── Prompt building ───────────────────────────────────────────────────────────

_LANG_NAME = {"en": "English", "ja": "Japanese", "ko": "Korean", "fr": "French"}
_HEADINGS = {
    "en": ("Price action", "Technical picture", "Key levels", "Risks",
           "No specific news was found for this period. The following is a technical reading.",
           "This analysis is generated from historical data for learning only and is not investment advice."),
    "ja": ("値動きの背景", "テクニカル面", "重要な価格帯", "リスク",
           "この期間の具体的なニュースは見つかりませんでした。以下はテクニカル面からの観察です。",
           "本分析は過去データに基づく学習用の参考情報であり、投資助言ではありません。"),
    "ko": ("가격 흐름 배경", "기술적 분석", "주요 가격대", "위험 요인",
           "이 기간의 구체적인 뉴스는 찾지 못했습니다. 아래는 기술적 관찰입니다.",
           "이 분석은 과거 데이터를 바탕으로 한 학습용 참고 자료이며 투자 조언이 아닙니다."),
    "fr": ("Contexte du mouvement", "Lecture technique", "Niveaux clés", "Risques",
           "Aucune actualité précise n'a été trouvée sur cette période. Voici une lecture technique.",
           "Cette analyse est générée à partir de données historiques, à des fins d'apprentissage uniquement, et ne constitue pas un conseil en investissement."),
}


def _build_prompt_intl(symbol: str, stock_name: str, start_date: str, end_date: str,
                       stats: dict, tech: dict, news: list, is_us: bool, lang: str) -> str:
    lang_name = _LANG_NAME.get(lang, "English")
    h_bg, h_tech, h_lv, h_risk, no_news, disclaimer = _HEADINGS.get(lang, _HEADINGS["en"])
    if news:
        news_block = "\nNews in the same period (quote titles exactly as given):\n" + "".join(
            f"  - [{n['date']}] {n['title']} (source: {n['source']})\n" for n in news)
        guide = ("Using only the headlines listed above, name the specific headline and source behind any "
                 "event that may explain the move. Do not mention events that are not listed.")
    else:
        news_block = "\nNo news was found for this stock in this period.\n"
        guide = (f'Start with exactly this sentence, translated if needed: "{no_news}" Then describe only '
                 "price, volume and indicators. Never invent announcements, news or analyst views.")
    market = "US stocks" if is_us else "China A-shares"
    return f"""You are a professional technical analyst covering {market}. Interpret the selected candlestick range below.

Stock: {symbol} ({stock_name})
Range: {start_date} to {end_date} ({stats['bars']} bars)

Price and volume:
- Return: {stats['period_return']:+.2f}%
- High: {stats['high']:.2f}, Low: {stats['low']:.2f}
- Max amplitude: {stats['amplitude']:.2f}%
- Volume vs prior period: {stats['vol_change']:+.1f}%
- Annualized volatility: {stats['volatility']:.1f}%
{news_block}
Indicators at the end of the range:
- MACD: {tech['macd']}
- RSI: {tech['rsi']}
- Moving averages: {tech['ma']}

Write the whole answer in {lang_name}, 150-250 words, using exactly these bold headings:

**{h_bg}**
{guide}

**{h_tech}**
Describe MACD, RSI, moving averages and volume objectively.

**{h_lv}**
List support and resistance levels briefly.

**{h_risk}**
One or two main risks.

End with this line: {disclaimer}"""


def _build_prompt(symbol: str, stock_name: str, start_date: str, end_date: str,
                  stats: dict, tech: dict, news: list, is_us: bool = False, lang: str = "zh") -> str:
    if lang != "zh":
        return _build_prompt_intl(symbol, stock_name, start_date, end_date, stats, tech, news, is_us, lang)
    has_news  = bool(news)
    market_lbl = "美股" if is_us else "A股"

    if has_news:
        news_block = "\n【同期相关新闻（请直接引用原标题）】\n"
        for n in news:
            news_block += f"  - [{n['date']}] {n['title']}（来源：{n['source']}）\n"
        walk_guide = (
            "根据上方列出的新闻，明确引用具体新闻标题和来源，"
            "分析哪些事件可能是本轮行情涨跌的原因之一。"
            "只能引用上面列出的新闻，不得推测或编造未出现的事件。"
        )
    else:
        news_block = "\n【注意】未查到该时段该股票的相关新闻记录。\n"
        walk_guide = (
            "必须以\"未查到该时段的具体消息面信息，以下为技术面观察\"开头，"
            "仅根据价格、成交量、技术指标做客观描述，"
            "严禁虚构任何公司公告、新闻事件或分析师观点。"
        )

    return f"""你是专业的股票技术分析师（{market_lbl}方向），请根据以下数据对选定K线区间做走势解读。

股票：{symbol}（{stock_name}）
选定时段：{start_date} 至 {end_date}（共{stats['bars']}根K线）

【区间价格与成交量数据】
- 涨跌幅：{stats['period_return']:+.2f}%
- 区间最高：{stats['high']:.2f}，区间最低：{stats['low']:.2f}
- 最大振幅：{stats['amplitude']:.2f}%
- 成交量较前期变化：{stats['vol_change']:+.1f}%
- 区间年化波动率：{stats['volatility']:.1f}%
{news_block}
【技术指标（区间末尾状态）】
- MACD：{tech['macd']}
- RSI：{tech['rsi']}
- 均线：{tech['ma']}

请按以下结构输出，总字数200-300字：

**走势背景**
{walk_guide}

**技术面观察**
客观描述MACD、RSI、均线、成交量配合情况。

**关键价位**
简要列出区间支撑位和压力位。

**风险提示**
主要风险因素（1-2条）。

以上分析基于历史数据生成，仅供学习参考，不构成投资建议。"""


# ── AI call ───────────────────────────────────────────────────────────────────

_NO_AI = {
    "zh": "AI 服务暂时不可用，请稍后再试。",
    "en": "The AI service is unavailable right now. Please try again later.",
    "ja": "AIサービスは現在利用できません。しばらくしてから再度お試しください。",
    "ko": "AI 서비스를 지금 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    "fr": "Le service d'IA est indisponible pour le moment. Réessayez plus tard.",
}


def _call_ai(prompt: str, lang: str = "zh") -> tuple:
    """Try Gemini first, then DeepSeek. Returns (text, source_name)."""
    if GEMINI_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            resp  = model.generate_content(prompt)
            return resp.text.strip(), "Gemini"
        except Exception as exc:
            logger.warning("Gemini failed, trying DeepSeek: %s", exc)

    if DEEPSEEK_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=DEEPSEEK_KEY, base_url="https://api.deepseek.com")
            resp   = client.chat.completions.create(
                model="deepseek-chat",
                max_tokens=800,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": "你是专业的股票技术分析师，熟悉A股和美股市场。" if lang == "zh"
                     else f"You are a professional stock technical analyst. Always answer in {_LANG_NAME.get(lang, 'English')}."},
                    {"role": "user",   "content": prompt},
                ],
            )
            return resp.choices[0].message.content.strip(), "DeepSeek"
        except Exception as exc:
            logger.error("DeepSeek fallback failed: %s", exc)

    return _NO_AI.get(lang, _NO_AI["en"]), "none"


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/kline-segment")
def analyze_kline_segment(req: SegmentRequest):
    """
    Analyze a user-selected K-line time range for both CN (A-share) and US stocks.
    CN uses AkShare; US uses Polygon.io (same cache as /api/us/* routes).
    No news for US stocks is expected and handled gracefully (technical-only AI).
    """
    from services.indicator_service import calc_macd, calc_rsi, calc_ma

    is_us  = req.market == "us"
    symbol = req.symbol.strip().upper() if is_us else req.symbol.strip()
    lang   = req.lang if req.lang in _LANGS else "en"

    cache_key = (symbol, req.market, req.start_date, req.end_date, lang)
    hit = _result_cache.get(cache_key)
    if hit and time.time() - hit[0] < _RESULT_TTL:
        return hit[1]

    # ── Fetch OHLCV ───────────────────────────────────────────────────────────
    if is_us:
        all_us = _get_us_all_candles(symbol)
        seg_candles = [c for c in all_us if req.start_date <= c["date"] <= req.end_date]
        df = _candles_to_df(seg_candles)
    else:
        from services.stock_service import get_stock_history
        start_fmt = req.start_date.replace("-", "")
        end_fmt   = req.end_date.replace("-", "")
        df = get_stock_history(symbol, "daily", start_fmt, end_fmt, "qfq")

    if df is None or df.empty:
        label = f"{symbol} ({req.start_date} ~ {req.end_date})"
        raise HTTPException(status_code=404, detail=f"No data found for {label}")

    bars = len(df)
    if bars < 3:
        raise HTTPException(
            status_code=400,
            detail=f"Only {bars} bar(s) in the selected range — please select a longer period (min 3 bars)",
        )

    close_arr = df["close"].tolist()
    open_arr  = df["open"].tolist()
    high_arr  = df["high"].tolist()
    low_arr   = df["low"].tolist()
    vol_arr   = df["volume"].tolist()

    period_return = (close_arr[-1] - open_arr[0]) / open_arr[0] * 100
    seg_high      = max(high_arr)
    seg_low       = min(low_arr)
    amplitude     = (seg_high - seg_low) / open_arr[0] * 100
    avg_vol       = float(np.mean(vol_arr))

    rets = [
        (close_arr[i] - close_arr[i - 1]) / close_arr[i - 1]
        for i in range(1, len(close_arr))
        if close_arr[i - 1] > 0
    ]
    volatility = float(np.std(rets) * np.sqrt(252) * 100) if len(rets) >= 2 else 0.0

    # ── Volume change vs prior period of equal length ─────────────────────────
    vol_change = 0.0
    try:
        prior_end_dt   = datetime.strptime(req.start_date, "%Y-%m-%d") - pd.Timedelta(days=1)
        prior_start_dt = prior_end_dt - pd.Timedelta(days=bars * 2 + 10)
        prior_end_str   = prior_end_dt.strftime("%Y-%m-%d")
        prior_start_str = prior_start_dt.strftime("%Y-%m-%d")

        if is_us:
            prior_candles = [c for c in all_us if prior_start_str <= c["date"] <= prior_end_str]
            df_prior = _candles_to_df(prior_candles)
        else:
            from services.stock_service import get_stock_history
            df_prior = get_stock_history(
                symbol, "daily",
                prior_start_dt.strftime("%Y%m%d"),
                prior_end_dt.strftime("%Y%m%d"),
                "qfq",
            )

        if df_prior is not None and len(df_prior) >= bars:
            prior_vol = float(np.mean(df_prior["volume"].tail(bars).tolist()))
            if prior_vol > 0:
                vol_change = (avg_vol - prior_vol) / prior_vol * 100
    except Exception:
        pass

    stats = {
        "bars":          bars,
        "period_return": _safe(period_return),
        "high":          _safe(seg_high),
        "low":           _safe(seg_low),
        "amplitude":     _safe(amplitude),
        "vol_change":    _safe(vol_change, 1),
        "volatility":    _safe(volatility, 1),
        "start_open":    _safe(open_arr[0]),
        "end_close":     _safe(close_arr[-1]),
    }

    # ── Technical indicators ──────────────────────────────────────────────────
    # Indicators need warm-up bars (MACD ~35, MA20 20), so compute them over the history leading
    # up to the end of the range, not over the selected bars alone.
    df_ind = df
    try:
        if is_us:
            hist = [c for c in all_us if c["date"] <= req.end_date][-250:]
            if len(hist) > bars:
                df_ind = _candles_to_df(hist)
        else:
            from services.stock_service import get_stock_history
            warm_start = (datetime.strptime(req.start_date, "%Y-%m-%d") - pd.Timedelta(days=200)).strftime("%Y%m%d")
            df_long = get_stock_history(symbol, "daily", warm_start, req.end_date.replace("-", ""), "qfq")
            if df_long is not None and len(df_long) > bars:
                df_ind = df_long
    except Exception:
        df_ind = df
    macd_data = calc_macd(df_ind)
    rsi_data  = calc_rsi(df_ind, periods=[6, 12, 24])
    ma_data   = calc_ma(df_ind, windows=[5, 10, 20])

    tech = {
        "macd": _macd_state(macd_data, lang),
        "rsi":  _rsi_state(rsi_data, lang),
        "ma":   _ma_state(ma_data, close_arr[-1], lang),
    }

    # ── News in selected range ────────────────────────────────────────────────
    if is_us:
        news = _fetch_news_us(symbol, req.start_date, req.end_date)
    else:
        news = _fetch_news_cn(symbol, req.start_date, req.end_date)

    # ── AI interpretation ─────────────────────────────────────────────────────
    prompt             = _build_prompt(
        symbol, req.stock_name or symbol,
        req.start_date, req.end_date,
        stats, tech, news, is_us, lang,
    )
    ai_text, ai_source = _call_ai(prompt, lang)

    out = {
        "symbol":      symbol,
        "start_date":  req.start_date,
        "end_date":    req.end_date,
        "market":      req.market,
        "stats":       stats,
        "tech":        tech,
        "news":        news,
        "has_news":    bool(news),
        "ai_analysis": ai_text,
        "ai_source":   ai_source,
        "lang":        lang,
    }
    if ai_source != "none":
        if len(_result_cache) > 500:
            _result_cache.clear()
        _result_cache[cache_key] = (time.time(), out)
    return out

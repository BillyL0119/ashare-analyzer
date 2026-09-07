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
import numpy as np
import pandas as pd
from datetime import datetime

logger = logging.getLogger("kline_analysis")
router = APIRouter()

GEMINI_KEY   = os.environ.get("GEMINI_API_KEY", "")
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")


# ── Request model ─────────────────────────────────────────────────────────────

class SegmentRequest(BaseModel):
    symbol:     str
    start_date: str            # "YYYY-MM-DD"
    end_date:   str            # "YYYY-MM-DD"
    market:     str = "cn"
    stock_name: Optional[str] = ""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe(val, decimals: int = 2) -> float:
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return round(f, decimals)
    except Exception:
        return 0.0


def _macd_state(macd_data: list) -> str:
    if len(macd_data) < 2:
        return "数据不足"
    last = macd_data[-1]
    prev = macd_data[-2]
    dif    = last.get("dif")  or 0
    dea    = last.get("dea")  or 0
    hist   = last.get("macd") or 0
    prev_h = prev.get("macd") or 0
    if dif > dea:
        if hist > 0 and hist >= prev_h:
            return "金叉上扬，多头趋势增强"
        return "DIF在DEA上方，多头偏强"
    else:
        if hist < 0 and hist <= prev_h:
            return "死叉下行，空头趋势增强"
        return "DIF在DEA下方，空头偏弱"


def _rsi_state(rsi_data: list) -> str:
    if not rsi_data:
        return "数据不足"
    last = rsi_data[-1]
    rsi6 = last.get("rsi6") or 50
    if rsi6 >= 80:  return f"RSI6={rsi6:.1f}，严重超买"
    if rsi6 >= 70:  return f"RSI6={rsi6:.1f}，超买区间"
    if rsi6 <= 20:  return f"RSI6={rsi6:.1f}，严重超卖"
    if rsi6 <= 30:  return f"RSI6={rsi6:.1f}，超卖区间"
    return f"RSI6={rsi6:.1f}，中性区间"


def _ma_state(ma_data: list, last_close: float) -> str:
    if not ma_data:
        return "数据不足"
    last = ma_data[-1]
    parts = []
    for key, label in [("ma5", "MA5"), ("ma10", "MA10"), ("ma20", "MA20")]:
        val = last.get(key)
        if val:
            rel = "上方" if last_close > val else "下方"
            parts.append(f"收盘{last_close:.2f}在{label}({val:.2f}){rel}")
    return "；".join(parts[:2]) if parts else "均线状态不足"


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
    """
    Attempt Yahoo Finance RSS for US symbols, filtered to the date range.
    Yahoo RSS only carries recent headlines, so historical ranges typically
    return [] — that's fine; the AI falls back to technical-only analysis.
    """
    import requests
    import xml.etree.ElementTree as ET
    import email.utils
    url = (
        f"https://feeds.finance.yahoo.com/rss/2.0/headline"
        f"?s={symbol}&region=US&lang=en-US"
    )
    try:
        r = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code != 200:
            return []
        root  = ET.fromstring(r.text)
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end   = datetime.strptime(end_date,   "%Y-%m-%d")
        result = []
        for item in root.findall(".//item"):
            title   = (item.findtext("title") or "").strip()
            pub_raw = (item.findtext("pubDate") or "").strip()
            if not title:
                continue
            try:
                pub = email.utils.parsedate_to_datetime(pub_raw).replace(tzinfo=None)
                if not (start <= pub <= end):
                    continue
            except Exception:
                continue
            result.append({
                "title":  title,
                "source": "Yahoo Finance",
                "date":   pub.strftime("%Y-%m-%d"),
            })
        return result[:10]
    except Exception as exc:
        logger.debug("US Yahoo RSS failed for %s: %s", symbol, exc)
        return []


# ── Prompt building ───────────────────────────────────────────────────────────

def _build_prompt(symbol: str, stock_name: str, start_date: str, end_date: str,
                  stats: dict, tech: dict, news: list, is_us: bool = False) -> str:
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

def _call_ai(prompt: str) -> tuple:
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
                    {"role": "system", "content": "你是专业的股票技术分析师，熟悉A股和美股市场。"},
                    {"role": "user",   "content": prompt},
                ],
            )
            return resp.choices[0].message.content.strip(), "DeepSeek"
        except Exception as exc:
            logger.error("DeepSeek fallback failed: %s", exc)

    return "AI服务未配置，暂无AI解读。请联系管理员配置 GEMINI_API_KEY 或 DEEPSEEK_API_KEY。", "none"


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
    macd_data = calc_macd(df)
    rsi_data  = calc_rsi(df, periods=[6, 12, 24])
    ma_data   = calc_ma(df, windows=[5, 10, 20])

    tech = {
        "macd": _macd_state(macd_data),
        "rsi":  _rsi_state(rsi_data),
        "ma":   _ma_state(ma_data, close_arr[-1]),
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
        stats, tech, news, is_us,
    )
    ai_text, ai_source = _call_ai(prompt)

    return {
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
    }

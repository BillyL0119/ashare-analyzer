"""
K-line segment analysis — POST /api/analysis/kline-segment

Given a stock symbol + date range the user selected on the chart, returns:
  - Basic stats: period return, high/low, amplitude, vol change, volatility
  - Technical indicator summary (MACD / RSI / MA state at end of range)
  - News within the date range (fetched from East Money, may be empty)
  - AI interpretation: strictly distinguishes news-backed analysis from
    pure technical description when no news is found

AI priority: Gemini (GEMINI_API_KEY) → DeepSeek (DEEPSEEK_API_KEY) → error msg
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
    dif      = last.get("dif")  or 0
    dea      = last.get("dea")  or 0
    hist     = last.get("macd") or 0
    prev_h   = prev.get("macd") or 0
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


def _fetch_news_in_range(symbol: str, start_date: str, end_date: str) -> list:
    """Fetch East Money stock news and filter to the given date range."""
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
        logger.warning("segment news fetch failed for %s: %s", symbol, exc)
        return []


def _build_prompt(symbol: str, stock_name: str, start_date: str, end_date: str,
                  stats: dict, tech: dict, news: list) -> str:
    has_news = bool(news)

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

    return f"""你是专业的A股技术分析师，请根据以下数据对选定K线区间做走势解读。

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
                    {"role": "system", "content": "你是专业的A股技术分析师。"},
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
    Analyze a user-selected K-line time range.
    Returns stats, technical indicators, news in range, and AI interpretation.
    Strictly distinguishes news-backed from pure technical analysis in the prompt.
    """
    from services.stock_service import get_stock_history
    from services.indicator_service import calc_macd, calc_rsi, calc_ma

    symbol    = req.symbol.strip()
    start_fmt = req.start_date.replace("-", "")
    end_fmt   = req.end_date.replace("-", "")

    if req.market == "us":
        raise HTTPException(status_code=400, detail="暂不支持美股区间分析")

    # ── Fetch OHLCV for the selected range ────────────────────────────────────
    df = get_stock_history(symbol, "daily", start_fmt, end_fmt, "qfq")
    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"未找到 {symbol} 在 {req.start_date}~{req.end_date} 的数据",
        )

    bars = len(df)
    if bars < 3:
        raise HTTPException(
            status_code=400,
            detail=f"选中区间仅 {bars} 根K线，数据不足，请选择更长的时间段（至少需要3根K线）",
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

    # Compare volume to prior period of equal length
    vol_change = 0.0
    try:
        prior_end   = (datetime.strptime(req.start_date, "%Y-%m-%d")
                       - pd.Timedelta(days=1)).strftime("%Y%m%d")
        prior_start = (datetime.strptime(req.start_date, "%Y-%m-%d")
                       - pd.Timedelta(days=bars * 2 + 10)).strftime("%Y%m%d")
        df_prior = get_stock_history(symbol, "daily", prior_start, prior_end, "qfq")
        if df_prior is not None and len(df_prior) >= bars:
            prior_vol  = float(np.mean(df_prior["volume"].tail(bars).tolist()))
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
    news = _fetch_news_in_range(symbol, req.start_date, req.end_date)

    # ── AI interpretation ─────────────────────────────────────────────────────
    prompt             = _build_prompt(symbol, req.stock_name or symbol,
                                       req.start_date, req.end_date, stats, tech, news)
    ai_text, ai_source = _call_ai(prompt)

    return {
        "symbol":      symbol,
        "start_date":  req.start_date,
        "end_date":    req.end_date,
        "stats":       stats,
        "tech":        tech,
        "news":        news,
        "has_news":    bool(news),
        "ai_analysis": ai_text,
        "ai_source":   ai_source,
    }

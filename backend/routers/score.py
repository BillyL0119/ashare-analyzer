"""
Stock scoring API — /api/stock/score/{symbol}

Scores a stock 0-100 across 4 dimensions:
  Technical  (30): trend, RSI, MACD
  Fundamental(40): PE, PB, ROE, revenue growth
  Sentiment  (15): volume, news
  Risk       (15): volatility, max drawdown

Grade: A+(90-100) A(80-89) B+(70-79) B(60-69) C(50-59) D(<50)
Cache: 1 hour per symbol. Supports A-share (6-digit) and US tickers.
"""

from fastapi import APIRouter, HTTPException
import numpy as np
import math
import time
import logging

router = APIRouter()
logger = logging.getLogger("score")

_cache: dict = {}
_CACHE_TTL = 3600

# Sector median PE references (used for relative scoring)
_SECTOR_PE = {
    'Technology': 35, 'Communication Services': 28, 'Consumer Cyclical': 28,
    'Healthcare': 24, 'Industrials': 22, 'Consumer Defensive': 22,
    'Financial Services': 14, 'Energy': 14, 'Basic Materials': 18,
    'Real Estate': 28, 'Utilities': 18,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe(val):
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return None


def _is_cn(symbol: str) -> bool:
    return symbol.isdigit()


def _to_sina(symbol: str) -> str:
    return ("sh" if symbol.startswith(("6", "5")) else "sz") + symbol


def _to_yf_cn(symbol: str) -> str:
    return f"{symbol}.SS" if symbol.startswith("6") else f"{symbol}.SZ"


def _ema(data: list, span: int) -> list:
    k = 2 / (span + 1)
    out = [data[0]]
    for x in data[1:]:
        out.append(x * k + out[-1] * (1 - k))
    return out


def _rsi(closes: list, period: int = 14) -> float:
    if len(closes) <= period:
        return 50.0
    delta = np.diff(np.array(closes, dtype=float))
    gain = np.where(delta > 0, delta, 0.0)
    loss = np.where(delta < 0, -delta, 0.0)
    ag = gain[-period:].mean()
    al = loss[-period:].mean()
    if al == 0:
        return 100.0
    return float(100 - 100 / (1 + ag / al))


def _max_drawdown(closes: list) -> float:
    arr = np.array(closes, dtype=float)
    peak, max_dd = arr[0], 0.0
    for v in arr:
        if v > peak:
            peak = v
        dd = (peak - v) / peak
        if dd > max_dd:
            max_dd = dd
    return max_dd


# ── Fetch yfinance info with fallbacks ────────────────────────────────────────

def _fetch_yf_info(yf_sym: str) -> dict:
    """Fetch yfinance info dict, trying multiple approaches."""
    import yfinance as yf

    ticker = yf.Ticker(yf_sym)

    # Primary: .info (full dict)
    info = {}
    try:
        info = ticker.info or {}
        if info and info.get("regularMarketPrice") is not None:
            logger.info("yfinance .info OK for %s, keys=%d", yf_sym, len(info))
            return info
        logger.warning("yfinance .info empty/incomplete for %s", yf_sym)
    except Exception as e:
        logger.warning("yfinance .info failed for %s: %s", yf_sym, e)

    # Fallback: fast_info (light-weight, fewer fields but more reliable)
    try:
        fi = ticker.fast_info
        fallback = {}
        for attr, key in [
            ("pe_ratio", "trailingPE"),
            ("price_to_book", "priceToBook"),
        ]:
            v = getattr(fi, attr, None)
            if v is not None:
                fallback[key] = v
        if fallback:
            logger.info("yfinance fast_info fallback for %s: %s", yf_sym, list(fallback))
            return {**info, **fallback}
    except Exception as e:
        logger.warning("yfinance fast_info failed for %s: %s", yf_sym, e)

    # Fallback: financials / balance sheet to compute metrics manually
    try:
        ib = ticker.income_stmt
        bs = ticker.balance_sheet
        hist = ticker.history(period="1d")
        if not ib.empty and not bs.empty and not hist.empty:
            price = float(hist["Close"].iloc[-1])
            # EPS
            eps_row = [r for r in ib.index if "EPS" in str(r) or "Diluted" in str(r)]
            net_row = [r for r in ib.index if "Net Income" in str(r)]
            shares_row = [r for r in bs.index if "Ordinary Shares Number" in str(r) or "Common Stock" in str(r)]

            if eps_row:
                eps = float(ib.loc[eps_row[0]].iloc[0])
                if eps > 0:
                    fallback2 = info.copy()
                    fallback2.setdefault("trailingPE", price / eps)
                    logger.info("yfinance computed PE from financials for %s: %.1f", yf_sym, price / eps)
                    return fallback2
    except Exception as e:
        logger.warning("yfinance financials fallback for %s: %s", yf_sym, e)

    return info


# ── Dimension scorers ─────────────────────────────────────────────────────────

def _tech(closes: list) -> tuple:
    details = []
    total = 0

    if len(closes) < 20:
        return 15, [{"dim": "technical", "dim_zh": "技术面", "score": 15, "max": 30,
                     "note_zh": "数据不足，给予中性分", "note_en": "Insufficient data, neutral score"}]

    arr = np.array(closes, dtype=float)
    last = arr[-1]
    ma20 = float(arr[-20:].mean())
    ma60 = float(arr[-min(60, len(arr)):].mean())

    # Trend (10) — use MA60 only if we have ≥60 bars
    if len(arr) >= 60:
        above_both = last > ma20 and last > ma60
        above_one  = last > ma20 or last > ma60
        if above_both:
            s = 10; zh = f"价格在MA20({ma20:.2f})和MA60({ma60:.2f})上方，趋势强劲"; en = f"Price above MA20 & MA60, strong uptrend"
        elif above_one:
            s = 6; zh = "价格在均线附近，趋势中性"; en = "Price near MAs, neutral trend"
        else:
            s = 2; zh = f"价格在MA20({ma20:.2f})和MA60({ma60:.2f})下方，趋势偏弱"; en = "Price below MA20 & MA60, weak trend"
    else:
        if last > ma20:
            s = 7; zh = f"价格在MA20({ma20:.2f})上方"; en = "Price above MA20"
        else:
            s = 3; zh = f"价格在MA20({ma20:.2f})下方"; en = "Price below MA20"
    total += s
    details.append({"dim": "trend", "dim_zh": "趋势", "score": s, "max": 10, "note_zh": zh, "note_en": en})

    # RSI (10)
    rsi = _rsi(closes)
    if rsi < 30:
        s = 10; zh = f"RSI={rsi:.1f}，超卖区域，存在反弹机会"; en = f"RSI={rsi:.1f}, oversold, potential bounce"
    elif rsi <= 40:
        s = 8; zh = f"RSI={rsi:.1f}，偏低，有上行空间"; en = f"RSI={rsi:.1f}, slightly low, room to rise"
    elif rsi <= 60:
        s = 5; zh = f"RSI={rsi:.1f}，中性区间"; en = f"RSI={rsi:.1f}, neutral zone"
    elif rsi <= 70:
        s = 8; zh = f"RSI={rsi:.1f}，偏强，注意高位回调风险"; en = f"RSI={rsi:.1f}, strong but watch for pullback"
    else:
        s = 3; zh = f"RSI={rsi:.1f}，超买，短期风险较高"; en = f"RSI={rsi:.1f}, overbought, elevated short-term risk"
    total += s
    details.append({"dim": "rsi", "dim_zh": "RSI", "score": s, "max": 10, "note_zh": zh, "note_en": en})

    # MACD (10)
    if len(closes) >= 35:
        ema12 = _ema(closes, 12)
        ema26 = _ema(closes, 26)
        macd = [a - b for a, b in zip(ema12, ema26)]
        sig = _ema(macd, 9)
        hist_val = macd[-1] - sig[-1]
        cross = macd[-1] > sig[-1]
        cross_prev = macd[-2] > sig[-2] if len(macd) > 1 else cross
        golden = cross and not cross_prev
        death = not cross and cross_prev
        if golden or (cross and hist_val > 0):
            s = 10; zh = "MACD金叉，柱状图向上，买入信号"; en = "MACD golden cross, histogram rising, buy signal"
        elif cross and hist_val <= 0:
            s = 7; zh = "MACD金叉但动能减弱"; en = "Golden cross but momentum fading"
        elif death or (not cross and hist_val < 0):
            s = 2; zh = "MACD死叉，下行压力明显"; en = "MACD death cross, bearish pressure"
        else:
            s = 4; zh = "MACD中性区间"; en = "MACD neutral"
    else:
        s = 5; zh = "数据量有限，MACD参考性降低"; en = "Limited data, MACD less reliable"
    total += s
    details.append({"dim": "macd", "dim_zh": "MACD", "score": s, "max": 10, "note_zh": zh, "note_en": en})

    return total, details


def _volume_score(closes: list, volumes: list) -> tuple:
    if len(volumes) < 5 or len(closes) < 5:
        return 4, "成交量数据不足，给予中性分", "Insufficient volume data, neutral score"
    recent_vol = float(np.mean(volumes[-5:]))
    avg_vol = float(np.mean(volumes[-20:]) if len(volumes) >= 20 else np.mean(volumes))
    price_up = closes[-1] > closes[-5]
    if price_up and recent_vol > avg_vol * 1.1:
        return 8, "量价齐升，多头信号强烈", "Price and volume both rising, strong bull signal"
    elif price_up:
        return 5, "价格上涨，成交量平稳", "Price rising with steady volume"
    elif recent_vol > avg_vol * 1.1:
        return 2, "放量但价格未涨，需留意方向", "Volume spike without price gain, watch direction"
    else:
        return 4, "价格和成交量均处于中性", "Price and volume both neutral"


def _fundamental_us(symbol: str) -> tuple:
    """US stock fundamentals via yfinance with sector-aware PE scoring."""
    details = []
    total = 0

    info = {}
    try:
        info = _fetch_yf_info(symbol)
    except Exception as e:
        logger.warning("fundamental_us %s: %s", symbol, e)

    pe          = _safe(info.get("trailingPE") or info.get("forwardPE"))
    pb          = _safe(info.get("priceToBook"))
    roe         = _safe(info.get("returnOnEquity"))
    rev_growth  = _safe(info.get("revenueGrowth"))
    sector      = info.get("sector", "")

    # Sector-adjusted PE scoring (15)
    if pe and pe > 0:
        sector_pe = _SECTOR_PE.get(sector, 22)
        ratio = pe / sector_pe
        if ratio < 0.6:
            s = 15; zh = f"PE={pe:.1f}（行业均值{sector_pe:.0f}），估值明显便宜"; en = f"PE={pe:.1f} (sector avg {sector_pe:.0f}), cheap vs peers"
        elif ratio < 0.85:
            s = 12; zh = f"PE={pe:.1f}，低于行业均值，估值合理偏低"; en = f"PE={pe:.1f}, below sector avg, reasonably valued"
        elif ratio < 1.15:
            s = 8; zh = f"PE={pe:.1f}，与行业均值接近，估值合理"; en = f"PE={pe:.1f}, in line with sector avg, fair"
        elif ratio < 1.6:
            s = 5; zh = f"PE={pe:.1f}，略高于行业均值，存在溢价"; en = f"PE={pe:.1f}, above sector avg, some premium"
        else:
            s = 2; zh = f"PE={pe:.1f}，显著高于行业均值({sector_pe:.0f})，估值偏贵"; en = f"PE={pe:.1f}, well above sector avg ({sector_pe:.0f}), expensive"
    elif pe and pe < 0:
        s = 2; zh = f"PE={pe:.1f}（负值），公司暂时亏损"; en = f"PE={pe:.1f} (negative), company currently loss-making"
    else:
        s = 6; zh = "PE数据暂不可用，给予中性分"; en = "PE data unavailable, neutral score"
    total += s
    details.append({"dim": "pe", "dim_zh": "PE估值", "score": s, "max": 15, "note_zh": zh, "note_en": en})

    # PB scoring (10) — high ROE justifies high PB
    if pb and pb > 0:
        roe_val = (roe or 0) * 100
        # For companies with very high ROE (>30%), high PB is warranted
        pb_adj = pb / max(1, roe_val / 15) if roe_val > 30 else pb
        if pb_adj < 1 or pb < 1:
            s = 10; zh = f"PB={pb:.2f}，低于净资产，存在价值低估"; en = f"PB={pb:.2f}, below book value, potentially undervalued"
        elif pb_adj < 2:
            s = 8; zh = f"PB={pb:.2f}，估值合理"; en = f"PB={pb:.2f}, reasonable"
        elif pb_adj < 4:
            s = 5; zh = f"PB={pb:.2f}，偏高，需靠盈利支撑"; en = f"PB={pb:.2f}, elevated, needs earnings support"
        elif pb_adj < 7:
            s = 3; zh = f"PB={pb:.2f}，较高"; en = f"PB={pb:.2f}, high"
        else:
            s = 1; zh = f"PB={pb:.2f}，很高（注：高ROE企业正常）"; en = f"PB={pb:.2f}, very high (normal for high-ROE co.)"
    elif pb and pb < 0:
        # Negative book equity (heavy buybacks like AAPL) — not meaningful
        s = 5; zh = "PB为负（账面净值为负，通常因大量回购），不具参考意义"; en = "Negative book equity (heavy buybacks), metric not meaningful"
    else:
        s = 5; zh = "PB数据暂不可用"; en = "PB data unavailable"
    total += s
    details.append({"dim": "pb", "dim_zh": "PB估值", "score": s, "max": 10, "note_zh": zh, "note_en": en})

    # ROE (10)
    if roe is not None:
        r = roe * 100
        if r >= 30:   s = 10; zh = f"ROE={r:.1f}%，盈利能力极强"; en = f"ROE={r:.1f}%, exceptional profitability"
        elif r >= 20: s = 9;  zh = f"ROE={r:.1f}%，盈利能力强劲"; en = f"ROE={r:.1f}%, strong profitability"
        elif r >= 15: s = 7;  zh = f"ROE={r:.1f}%，盈利能力良好"; en = f"ROE={r:.1f}%, good profitability"
        elif r >= 10: s = 4;  zh = f"ROE={r:.1f}%，盈利能力一般"; en = f"ROE={r:.1f}%, average profitability"
        elif r >= 0:  s = 2;  zh = f"ROE={r:.1f}%，盈利能力较弱"; en = f"ROE={r:.1f}%, weak profitability"
        else:         s = 0;  zh = f"ROE={r:.1f}%（负值），净亏损"; en = f"ROE={r:.1f}% (negative), net loss"
    else:
        s = 5; zh = "ROE数据暂不可用"; en = "ROE data unavailable"
    total += s
    details.append({"dim": "roe", "dim_zh": "ROE", "score": s, "max": 10, "note_zh": zh, "note_en": en})

    # Revenue growth (5)
    if rev_growth is not None:
        r = rev_growth * 100
        if r >= 20:    s = 5; zh = f"营收增速={r:.1f}%，高速成长"; en = f"Revenue growth={r:.1f}%, high growth"
        elif r >= 10:  s = 4; zh = f"营收增速={r:.1f}%，稳健增长"; en = f"Revenue growth={r:.1f}%, steady growth"
        elif r >= 3:   s = 3; zh = f"营收增速={r:.1f}%，温和增长"; en = f"Revenue growth={r:.1f}%, modest growth"
        elif r >= 0:   s = 2; zh = f"营收增速={r:.1f}%，增长停滞"; en = f"Revenue growth={r:.1f}%, stagnant"
        else:          s = 0; zh = f"营收增速={r:.1f}%，营收下滑"; en = f"Revenue growth={r:.1f}%, declining revenue"
    else:
        s = 2; zh = "营收增速数据暂不可用"; en = "Revenue growth data unavailable"
    total += s
    details.append({"dim": "revenue", "dim_zh": "营收增速", "score": s, "max": 5, "note_zh": zh, "note_en": en})

    return total, details


def _fundamental_cn(symbol: str) -> tuple:
    """A-share fundamentals via AkShare."""
    details = []
    total = 0

    pe, pb, roe, rev_growth = None, None, None, None

    # Try AkShare stock_a_lg_indicator (returns pe/pb history)
    try:
        import akshare as ak
        df = ak.stock_a_lg_indicator(symbol=symbol)
        if not df.empty:
            latest = df.iloc[-1]
            pe = _safe(latest.get("pe", None))
            pb = _safe(latest.get("pb", None))
    except Exception as e:
        logger.warning("AkShare stock_a_lg_indicator %s: %s", symbol, e)

    # Supplement with yfinance for ROE/growth if AkShare missing
    try:
        import yfinance as yf
        yf_sym = _to_yf_cn(symbol)
        info = _fetch_yf_info(yf_sym)
        if pe is None:
            pe = _safe(info.get("trailingPE") or info.get("forwardPE"))
        if pb is None:
            pb = _safe(info.get("priceToBook"))
        roe = _safe(info.get("returnOnEquity"))
        rev_growth = _safe(info.get("revenueGrowth"))
    except Exception as e:
        logger.warning("yfinance supplement for CN %s: %s", symbol, e)

    # PE (15) — A-share sector average ~20-25
    if pe and pe > 0:
        if pe < 10:    s = 15; zh = f"PE={pe:.1f}，估值极低"; en = f"PE={pe:.1f}, very cheap"
        elif pe < 18:  s = 12; zh = f"PE={pe:.1f}，估值偏低"; en = f"PE={pe:.1f}, below market avg"
        elif pe < 28:  s = 8;  zh = f"PE={pe:.1f}，估值合理"; en = f"PE={pe:.1f}, reasonable"
        elif pe < 45:  s = 5;  zh = f"PE={pe:.1f}，估值偏高"; en = f"PE={pe:.1f}, elevated"
        else:          s = 2;  zh = f"PE={pe:.1f}，估值较贵"; en = f"PE={pe:.1f}, expensive"
    elif pe and pe < 0:
        s = 2; zh = f"PE={pe:.1f}（负值），暂时亏损"; en = f"PE={pe:.1f} (negative), loss-making"
    else:
        s = 6; zh = "PE数据暂不可用"; en = "PE data unavailable"
    total += s
    details.append({"dim": "pe", "dim_zh": "PE估值", "score": s, "max": 15, "note_zh": zh, "note_en": en})

    # PB (10)
    if pb and pb > 0:
        if pb < 1:   s = 10; zh = f"PB={pb:.2f}，低于净资产，价值低估"; en = f"PB={pb:.2f}, below book, undervalued"
        elif pb < 2: s = 8;  zh = f"PB={pb:.2f}，估值合理"; en = f"PB={pb:.2f}, reasonable"
        elif pb < 4: s = 5;  zh = f"PB={pb:.2f}，偏高"; en = f"PB={pb:.2f}, elevated"
        else:        s = 2;  zh = f"PB={pb:.2f}，估值较贵"; en = f"PB={pb:.2f}, expensive"
    else:
        s = 5; zh = "PB数据暂不可用"; en = "PB data unavailable"
    total += s
    details.append({"dim": "pb", "dim_zh": "PB估值", "score": s, "max": 10, "note_zh": zh, "note_en": en})

    # ROE (10)
    if roe is not None:
        r = roe * 100
        if r >= 20:   s = 10; zh = f"ROE={r:.1f}%，盈利能力强"; en = f"ROE={r:.1f}%, strong"
        elif r >= 15: s = 8;  zh = f"ROE={r:.1f}%，盈利能力良好"; en = f"ROE={r:.1f}%, good"
        elif r >= 10: s = 5;  zh = f"ROE={r:.1f}%，盈利能力一般"; en = f"ROE={r:.1f}%, average"
        elif r >= 0:  s = 2;  zh = f"ROE={r:.1f}%，盈利能力较弱"; en = f"ROE={r:.1f}%, weak"
        else:         s = 0;  zh = f"ROE={r:.1f}%（负值），净亏损"; en = f"ROE={r:.1f}%, loss-making"
    else:
        s = 5; zh = "ROE数据暂不可用"; en = "ROE data unavailable"
    total += s
    details.append({"dim": "roe", "dim_zh": "ROE", "score": s, "max": 10, "note_zh": zh, "note_en": en})

    # Revenue growth (5)
    if rev_growth is not None:
        r = rev_growth * 100
        if r >= 20:   s = 5; zh = f"营收增速={r:.1f}%，高速成长"; en = f"Revenue growth={r:.1f}%, high growth"
        elif r >= 10: s = 4; zh = f"营收增速={r:.1f}%，稳健增长"; en = f"Revenue growth={r:.1f}%, steady"
        elif r >= 3:  s = 3; zh = f"营收增速={r:.1f}%，温和增长"; en = f"Revenue growth={r:.1f}%, modest"
        elif r >= 0:  s = 1; zh = f"营收增速={r:.1f}%，增长停滞"; en = f"Revenue growth={r:.1f}%, stagnant"
        else:         s = 0; zh = f"营收增速={r:.1f}%，营收下滑"; en = f"Revenue growth={r:.1f}%, declining"
    else:
        s = 2; zh = "营收增速数据暂不可用"; en = "Revenue growth data unavailable"
    total += s
    details.append({"dim": "revenue", "dim_zh": "营收增速", "score": s, "max": 5, "note_zh": zh, "note_en": en})

    return total, details


def _sentiment(vol_s: int, vol_zh: str, vol_en: str, symbol: str, market: str) -> tuple:
    details = [{"dim": "volume", "dim_zh": "成交量", "score": vol_s, "max": 8, "note_zh": vol_zh, "note_en": vol_en}]
    total = vol_s

    news_s = 4; news_zh = "新闻舆情中性"; news_en = "Neutral news sentiment"
    try:
        from routers.news import _result_cache as news_cache
        if symbol in news_cache:
            _, cached_news = news_cache[symbol]
            overall = cached_news.get("overall", {})
            label = overall.get("label", "neutral")
            if label == "positive":
                news_s = 7; news_zh = "新闻舆情正面"; news_en = "Positive news sentiment"
            elif label == "negative":
                news_s = 1; news_zh = "新闻舆情负面"; news_en = "Negative news sentiment"
    except Exception as e:
        logger.debug("News cache lookup failed: %s", e)

    total += news_s
    details.append({"dim": "news", "dim_zh": "新闻情绪", "score": news_s, "max": 7, "note_zh": news_zh, "note_en": news_en})
    return total, details


def _risk(closes: list) -> tuple:
    if len(closes) < 10:
        return 7, [{"dim": "risk", "dim_zh": "风险", "score": 7, "max": 15,
                    "note_zh": "数据不足，给予中性分", "note_en": "Insufficient data, neutral"}]
    details = []
    total = 0
    arr = np.array(closes, dtype=float)
    rets = np.diff(arr) / arr[:-1]

    ann_vol = float(np.std(rets) * np.sqrt(252) * 100)
    if ann_vol < 20:    s = 8; zh = f"年化波动率={ann_vol:.1f}%，低波动稳定"; en = f"Ann.vol={ann_vol:.1f}%, low & stable"
    elif ann_vol < 35:  s = 5; zh = f"年化波动率={ann_vol:.1f}%，波动中等"; en = f"Ann.vol={ann_vol:.1f}%, moderate"
    else:               s = 2; zh = f"年化波动率={ann_vol:.1f}%，高波动高风险"; en = f"Ann.vol={ann_vol:.1f}%, high volatility"
    total += s
    details.append({"dim": "volatility", "dim_zh": "波动率", "score": s, "max": 8, "note_zh": zh, "note_en": en})

    max_dd = _max_drawdown(closes) * 100
    if max_dd < 10:    s = 7; zh = f"最大回撤={max_dd:.1f}%，回撤控制良好"; en = f"Max drawdown={max_dd:.1f}%, well controlled"
    elif max_dd < 20:  s = 4; zh = f"最大回撤={max_dd:.1f}%，回撤中等"; en = f"Max drawdown={max_dd:.1f}%, moderate"
    else:              s = 1; zh = f"最大回撤={max_dd:.1f}%，回撤较大，注意风险"; en = f"Max drawdown={max_dd:.1f}%, large, manage risk"
    total += s
    details.append({"dim": "drawdown", "dim_zh": "最大回撤", "score": s, "max": 7, "note_zh": zh, "note_en": en})

    return total, details


def _grade(total: int) -> str:
    if total >= 90: return "A+"
    if total >= 80: return "A"
    if total >= 70: return "B+"
    if total >= 60: return "B"
    if total >= 50: return "C"
    return "D"


def _summary(total, grade, tech, fund, sent, risk) -> tuple:
    grade_zh = {"A+": "优秀", "A": "良好", "B+": "较好", "B": "中等", "C": "一般", "D": "较弱"}.get(grade, "")
    grade_en = {"A+": "Excellent", "A": "Good", "B+": "Above Average", "B": "Average", "C": "Below Average", "D": "Weak"}.get(grade, "")
    zh = f"综合评级 {grade}（{grade_zh}），总分 {total}/100。"
    en = f"Overall rating {grade} ({grade_en}), score {total}/100."
    pts_zh, pts_en = [], []
    if tech >= 22:  pts_zh.append("技术面强势");       pts_en.append("strong technicals")
    if fund >= 30:  pts_zh.append("基本面扎实");       pts_en.append("solid fundamentals")
    if sent >= 12:  pts_zh.append("市场情绪积极");     pts_en.append("positive sentiment")
    if risk >= 12:  pts_zh.append("风险控制较好");     pts_en.append("good risk control")
    if tech < 15:   pts_zh.append("技术面偏弱");       pts_en.append("weak technicals")
    if fund < 20:   pts_zh.append("基本面有待关注");   pts_en.append("fundamentals need attention")
    if risk < 8:    pts_zh.append("波动风险较高");     pts_en.append("higher volatility risk")
    if pts_zh:
        zh += "主要特点：" + "、".join(pts_zh) + "。建议结合市场行情综合决策。"
        en += " Key points: " + ", ".join(pts_en) + ". Combine with market conditions."
    else:
        zh += "整体状况良好，请结合市场行情综合判断，注意风险。"
        en += " Overall in good shape. Always assess market conditions and manage risk."
    return zh, en


def _compute(symbol: str) -> dict:
    is_cn = _is_cn(symbol)
    closes, volumes = [], []

    if is_cn:
        try:
            import akshare as ak
            df = ak.stock_zh_a_daily(symbol=_to_sina(symbol), adjust="qfq")
            df = df.sort_index().tail(252)
            closes = df["close"].dropna().tolist()
            volumes = df["volume"].dropna().tolist() if "volume" in df.columns else []
        except Exception as e:
            logger.warning("AkShare price %s: %s", symbol, e)
    else:
        try:
            import yfinance as yf
            hist = yf.Ticker(symbol).history(period="1y")
            closes = hist["Close"].dropna().tolist()
            volumes = hist["Volume"].dropna().tolist() if "Volume" in hist.columns else []
        except Exception as e:
            logger.warning("yfinance price %s: %s", symbol, e)

    logger.info("Score compute %s: %d price bars", symbol, len(closes))

    tech_score, tech_details = _tech(closes)
    vol_s, vol_zh, vol_en = _volume_score(closes, volumes)

    try:
        if is_cn:
            fund_score, fund_details = _fundamental_cn(symbol)
        else:
            fund_score, fund_details = _fundamental_us(symbol)
    except Exception as e:
        logger.warning("fundamental %s: %s", symbol, e)
        fund_score, fund_details = 20, [{"dim": "fundamental", "dim_zh": "基本面", "score": 20, "max": 40,
                                          "note_zh": "基本面数据获取失败，给予中性分", "note_en": "Fundamental data unavailable, neutral score"}]

    sent_score, sent_details = _sentiment(vol_s, vol_zh, vol_en, symbol, "cn" if is_cn else "us")
    risk_score, risk_details = _risk(closes)

    total = min(100, max(0, tech_score + fund_score + sent_score + risk_score))
    grade = _grade(total)
    summary_zh, summary_en = _summary(total, grade, tech_score, fund_score, sent_score, risk_score)

    return {
        "symbol": symbol,
        "total": total,
        "grade": grade,
        "summary_zh": summary_zh,
        "summary_en": summary_en,
        "dimensions": {
            "technical":   {"score": tech_score,  "max": 30, "details": tech_details},
            "fundamental": {"score": fund_score,  "max": 40, "details": fund_details},
            "sentiment":   {"score": sent_score,  "max": 15, "details": sent_details},
            "risk":        {"score": risk_score,  "max": 15, "details": risk_details},
        },
    }


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{symbol}")
def get_score(symbol: str):
    now = time.time()
    if symbol in _cache:
        ts, data = _cache[symbol]
        if now - ts < _CACHE_TTL:
            return data
    try:
        result = _compute(symbol)
        _cache[symbol] = (now, result)
        logger.info("Score %s: %d (%s)", symbol, result["total"], result["grade"])
        return result
    except Exception as exc:
        logger.exception("Score error %s", symbol)
        raise HTTPException(status_code=500, detail=str(exc))

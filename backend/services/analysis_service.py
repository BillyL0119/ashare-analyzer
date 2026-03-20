import numpy as np
import pandas as pd
from typing import Optional


def _pearson_correlation(a: list, b: list) -> float:
    if len(a) < 5:
        return 0.0
    arr_a = np.array(a, dtype=float)
    arr_b = np.array(b, dtype=float)
    mask = ~(np.isnan(arr_a) | np.isnan(arr_b))
    arr_a, arr_b = arr_a[mask], arr_b[mask]
    if len(arr_a) < 5:
        return 0.0
    corr = np.corrcoef(arr_a, arr_b)[0, 1]
    return round(float(corr), 4) if not np.isnan(corr) else 0.0


def _detect_trend(closes: list, lang: str = 'zh') -> str:
    if len(closes) < 10:
        return '数据不足' if lang == 'zh' else 'Insufficient Data'
    x = np.arange(len(closes))
    y = np.array(closes, dtype=float)
    slope = np.polyfit(x, y, 1)[0]
    pct_slope = slope / y[0] * 100
    if lang == 'en':
        if pct_slope > 0.05:
            return 'Uptrend'
        elif pct_slope < -0.05:
            return 'Downtrend'
        else:
            return 'Sideways'
    else:
        if pct_slope > 0.05:
            return '上升趋势'
        elif pct_slope < -0.05:
            return '下降趋势'
        else:
            return '横盘震荡'


def _find_peaks_troughs(arr: np.ndarray, window: int):
    peaks, troughs = [], []
    n = len(arr)
    for i in range(window, n - window):
        segment = arr[i - window: i + window + 1]
        if arr[i] == segment.max():
            peaks.append((i, float(arr[i])))
        if arr[i] == segment.min():
            troughs.append((i, float(arr[i])))
    return peaks, troughs


def _detect_patterns(closes: list, lang: str = 'zh') -> list:
    patterns = []
    n = len(closes)
    if n < 30:
        return patterns

    arr = np.array(closes, dtype=float)
    window = max(5, n // 20)
    peaks, troughs = _find_peaks_troughs(arr, window)

    if lang == 'en':
        names = {
            'double_top': 'Double Top',
            'double_bottom': 'Double Bottom',
            'hs_top': 'Head & Shoulders',
            'hs_bottom': 'Inverse H&S',
            'rising_wedge': 'Rising Wedge',
            'falling_wedge': 'Falling Wedge',
        }
    else:
        names = {
            'double_top': '双顶形态',
            'double_bottom': '双底形态',
            'hs_top': '头肩顶形态',
            'hs_bottom': '头肩底形态',
            'rising_wedge': '上升楔形',
            'falling_wedge': '下降楔形',
        }

    if len(peaks) >= 2:
        p1, p2 = peaks[-2], peaks[-1]
        if abs(p1[1] - p2[1]) / max(p1[1], p2[1]) < 0.03:
            patterns.append(names['double_top'])

    if len(troughs) >= 2:
        t1, t2 = troughs[-2], troughs[-1]
        if abs(t1[1] - t2[1]) / max(t1[1], t2[1]) < 0.03:
            patterns.append(names['double_bottom'])

    if len(peaks) >= 3:
        p1, p2, p3 = peaks[-3], peaks[-2], peaks[-1]
        if (p2[1] > p1[1] and p2[1] > p3[1]
                and abs(p1[1] - p3[1]) / max(p1[1], p3[1]) < 0.05):
            patterns.append(names['hs_top'])

    if len(troughs) >= 3:
        t1, t2, t3 = troughs[-3], troughs[-2], troughs[-1]
        if (t2[1] < t1[1] and t2[1] < t3[1]
                and abs(t1[1] - t3[1]) / max(t1[1], t3[1]) < 0.05):
            patterns.append(names['hs_bottom'])

    if len(peaks) >= 2 and len(troughs) >= 2:
        peak_slope = peaks[-1][1] - peaks[-2][1]
        trough_slope = troughs[-1][1] - troughs[-2][1]
        if peak_slope > 0 and trough_slope > 0 and trough_slope > peak_slope:
            patterns.append(names['rising_wedge'])
        elif peak_slope < 0 and trough_slope < 0 and trough_slope < peak_slope:
            patterns.append(names['falling_wedge'])

    return patterns


def _calc_volatility(closes: list) -> float:
    arr = np.array(closes, dtype=float)
    returns = np.diff(arr) / arr[:-1]
    if len(returns) < 5:
        return 0.0
    return round(float(np.std(returns) * np.sqrt(252) * 100), 2)


def _calc_max_drawdown(closes: list) -> float:
    arr = np.array(closes, dtype=float)
    peak = arr[0]
    max_dd = 0.0
    for v in arr:
        if v > peak:
            peak = v
        dd = (peak - v) / peak * 100
        if dd > max_dd:
            max_dd = dd
    return round(float(max_dd), 2)


def _support_resistance(closes: list) -> dict:
    arr = np.array(closes[-60:] if len(closes) > 60 else closes, dtype=float)
    return {
        "support": round(float(np.percentile(arr, 10)), 3),
        "resistance": round(float(np.percentile(arr, 90)), 3),
    }


def _sharpe_ratio(closes: list) -> float:
    arr = np.array(closes, dtype=float)
    returns = np.diff(arr) / arr[:-1]
    if len(returns) < 5 or np.std(returns) == 0:
        return 0.0
    sharpe = (np.mean(returns) * 252) / (np.std(returns) * np.sqrt(252))
    return round(float(sharpe), 2)


def _stock_stats(closes: list, df_aligned: pd.DataFrame, lang: str = 'zh') -> dict:
    total_return = (closes[-1] - closes[0]) / closes[0] * 100
    avg_vol = float(df_aligned["volume"].mean()) if "volume" in df_aligned.columns else 0.0
    return {
        "total_return": round(total_return, 2),
        "volatility": _calc_volatility(closes),
        "max_drawdown": _calc_max_drawdown(closes),
        "sharpe": _sharpe_ratio(closes),
        "trend": _detect_trend(closes, lang),
        "patterns": _detect_patterns(closes, lang),
        "support_resistance": _support_resistance(closes),
        "avg_volume": round(avg_vol, 0),
        "start_price": round(float(closes[0]), 3),
        "end_price": round(float(closes[-1]), 3),
    }


def _generate_interpretation_zh(name1, s1, name2, s2, corr, price_sim, days) -> str:
    lines = []

    if corr > 0.7:
        corr_desc = (f"两只股票日收益率相关系数为 **{corr:.2f}**，呈强正相关，"
                     "走势高度同步，可能受相同行业或宏观因素共同驱动。")
    elif corr > 0.4:
        corr_desc = (f"两只股票日收益率相关系数为 **{corr:.2f}**，呈中等正相关，"
                     "部分时段走势趋同，但各自也存在独立行情。")
    elif corr > 0:
        corr_desc = (f"两只股票日收益率相关系数为 **{corr:.2f}**，呈弱正相关，"
                     "整体关联性较低，走势基本独立。")
    elif corr > -0.4:
        corr_desc = (f"两只股票日收益率相关系数为 **{corr:.2f}**，呈弱负相关，"
                     "走势倾向于相互独立，可作为分散风险的组合参考。")
    else:
        corr_desc = (f"两只股票日收益率相关系数为 **{corr:.2f}**，呈较强负相关，"
                     "走势倾向于反向运动，具有一定对冲价值。")
    lines.append("【相关性分析】\n" + corr_desc)

    sim_pct = round(price_sim * 100, 1)
    lines.append(f"【价格走势相似度】\n归一化价格序列的相关系数为 **{price_sim:.2f}**（相似度 {sim_pct}%），"
                 + ("两者价格走势高度吻合。" if price_sim > 0.8 else
                    "两者价格走势较为接近。" if price_sim > 0.5 else
                    "两者价格走势存在明显差异。"))

    r1, r2 = s1["total_return"], s2["total_return"]
    sign1 = "+" if r1 >= 0 else ""
    sign2 = "+" if r2 >= 0 else ""
    perf_line = f"在 {days} 个共同交易日内，{name1} 累计收益 **{sign1}{r1:.2f}%**，{name2} 累计收益 **{sign2}{r2:.2f}%**。"
    if r1 > 0 and r2 > 0:
        perf_line += "两只股票在此区间均实现正收益。"
    elif r1 < 0 and r2 < 0:
        perf_line += "两只股票在此区间均录得亏损。"
    else:
        better = name1 if r1 > r2 else name2
        diff = abs(r1 - r2)
        perf_line += f"{better} 表现更优，超额 {diff:.2f} 个百分点。"
    lines.append("【区间表现】\n" + perf_line)

    v1, v2 = s1["volatility"], s2["volatility"]
    dd1, dd2 = s1["max_drawdown"], s2["max_drawdown"]
    sh1, sh2 = s1["sharpe"], s2["sharpe"]
    risk_line = (f"{name1} 年化波动率 **{v1:.1f}%**，最大回撤 **-{dd1:.1f}%**，夏普比率 **{sh1:.2f}**；"
                 f"{name2} 年化波动率 **{v2:.1f}%**，最大回撤 **-{dd2:.1f}%**，夏普比率 **{sh2:.2f}**。")
    if abs(v1 - v2) < 3:
        risk_line += "两者风险水平相近。"
    elif v1 > v2:
        risk_line += f"{name1} 波动更大，风险相对较高。"
    else:
        risk_line += f"{name2} 波动更大，风险相对较高。"
    lines.append("【风险评估】\n" + risk_line)

    t1, t2 = s1["trend"], s2["trend"]
    if t1 == t2:
        trend_line = f"两只股票当前均处于 **{t1}** 状态。"
    else:
        trend_line = f"{name1} 处于 **{t1}**，{name2} 处于 **{t2}**，两者趋势存在分歧。"
    lines.append("【趋势判断】\n" + trend_line)

    p1, p2 = s1["patterns"], s2["patterns"]
    pat_lines = []
    if p1:
        pat_lines.append(f"{name1} 识别到：{'、'.join(p1)}。")
    if p2:
        pat_lines.append(f"{name2} 识别到：{'、'.join(p2)}。")
    if not pat_lines:
        pat_lines.append("当前时段内未识别到明显的经典技术形态。")
    lines.append("【形态识别】\n" + " ".join(pat_lines))

    sr1 = s1["support_resistance"]
    sr2 = s2["support_resistance"]
    lines.append(
        f"【关键价位】\n{name1} 近期支撑参考 **{sr1['support']}**，阻力参考 **{sr1['resistance']}**；"
        f"{name2} 近期支撑参考 **{sr2['support']}**，阻力参考 **{sr2['resistance']}**。"
    )

    return "\n\n".join(lines)


def _generate_interpretation_en(name1, s1, name2, s2, corr, price_sim, days) -> str:
    lines = []

    if corr > 0.7:
        corr_desc = (f"The two stocks have a daily return correlation of **{corr:.2f}**, indicating strong positive correlation. "
                     "Their price movements are highly synchronized, likely driven by the same sector or macro factors.")
    elif corr > 0.4:
        corr_desc = (f"The daily return correlation is **{corr:.2f}**, indicating moderate positive correlation. "
                     "The stocks move together at times but also show independent price action.")
    elif corr > 0:
        corr_desc = (f"The daily return correlation is **{corr:.2f}**, indicating weak positive correlation. "
                     "Overall co-movement is limited; the stocks are largely independent.")
    elif corr > -0.4:
        corr_desc = (f"The daily return correlation is **{corr:.2f}**, indicating weak negative correlation. "
                     "The stocks behave largely independently and may serve as a diversification pair.")
    else:
        corr_desc = (f"The daily return correlation is **{corr:.2f}**, indicating notable negative correlation. "
                     "The stocks tend to move in opposite directions, offering potential hedging value.")
    lines.append("[Correlation Analysis]\n" + corr_desc)

    sim_pct = round(price_sim * 100, 1)
    lines.append(f"[Price Similarity]\nNormalized price correlation is **{price_sim:.2f}** (similarity: {sim_pct}%). "
                 + ("Price trajectories are highly aligned." if price_sim > 0.8 else
                    "Price trajectories are moderately similar." if price_sim > 0.5 else
                    "Price trajectories diverge significantly."))

    r1, r2 = s1["total_return"], s2["total_return"]
    sign1 = "+" if r1 >= 0 else ""
    sign2 = "+" if r2 >= 0 else ""
    perf_line = f"Over **{days}** shared trading days, {name1} returned **{sign1}{r1:.2f}%** and {name2} returned **{sign2}{r2:.2f}%**. "
    if r1 > 0 and r2 > 0:
        perf_line += "Both stocks delivered positive returns over this period."
    elif r1 < 0 and r2 < 0:
        perf_line += "Both stocks declined over this period."
    else:
        better = name1 if r1 > r2 else name2
        diff = abs(r1 - r2)
        perf_line += f"{better} outperformed by {diff:.2f} percentage points."
    lines.append("[Period Performance]\n" + perf_line)

    v1, v2 = s1["volatility"], s2["volatility"]
    dd1, dd2 = s1["max_drawdown"], s2["max_drawdown"]
    sh1, sh2 = s1["sharpe"], s2["sharpe"]
    risk_line = (f"{name1}: Ann. Vol **{v1:.1f}%**, Max Drawdown **-{dd1:.1f}%**, Sharpe **{sh1:.2f}**. "
                 f"{name2}: Ann. Vol **{v2:.1f}%**, Max Drawdown **-{dd2:.1f}%**, Sharpe **{sh2:.2f}**. ")
    if abs(v1 - v2) < 3:
        risk_line += "Both stocks carry a similar risk profile."
    elif v1 > v2:
        risk_line += f"{name1} is more volatile and carries higher risk."
    else:
        risk_line += f"{name2} is more volatile and carries higher risk."
    lines.append("[Risk Assessment]\n" + risk_line)

    t1, t2 = s1["trend"], s2["trend"]
    if t1 == t2:
        trend_line = f"Both stocks are currently in an **{t1}** phase."
    else:
        trend_line = f"{name1} is in an **{t1}** phase while {name2} is in a **{t2}** phase — the two trends diverge."
    lines.append("[Trend Analysis]\n" + trend_line)

    p1, p2 = s1["patterns"], s2["patterns"]
    pat_lines = []
    if p1:
        pat_lines.append(f"{name1}: {', '.join(p1)}.")
    if p2:
        pat_lines.append(f"{name2}: {', '.join(p2)}.")
    if not pat_lines:
        pat_lines.append("No classic chart patterns were identified in the current period.")
    lines.append("[Pattern Recognition]\n" + " ".join(pat_lines))

    sr1 = s1["support_resistance"]
    sr2 = s2["support_resistance"]
    lines.append(
        f"[Key Price Levels]\n{name1} — Support: **{sr1['support']}**, Resistance: **{sr1['resistance']}**. "
        f"{name2} — Support: **{sr2['support']}**, Resistance: **{sr2['resistance']}**."
    )

    return "\n\n".join(lines)


def analyze_pair(
    df1: pd.DataFrame, name1: str,
    df2: pd.DataFrame, name2: str,
    lang: str = 'zh',
) -> dict:
    df1 = df1.copy().set_index("date")
    df2 = df2.copy().set_index("date")
    common_dates = df1.index.intersection(df2.index)

    if len(common_dates) < 10:
        msg = "Insufficient shared trading days (< 10) for analysis." if lang == 'en' else "共同交易日不足（少于10天），无法进行有效分析"
        return {"error": msg}

    df1a = df1.loc[common_dates].sort_index()
    df2a = df2.loc[common_dates].sort_index()

    closes1 = df1a["close"].tolist()
    closes2 = df2a["close"].tolist()

    returns1 = [(closes1[i] - closes1[i - 1]) / closes1[i - 1] for i in range(1, len(closes1))]
    returns2 = [(closes2[i] - closes2[i - 1]) / closes2[i - 1] for i in range(1, len(closes2))]
    correlation = _pearson_correlation(returns1, returns2)

    norm1 = [c / closes1[0] * 100 for c in closes1]
    norm2 = [c / closes2[0] * 100 for c in closes2]
    price_similarity = _pearson_correlation(norm1, norm2)

    stats1 = _stock_stats(closes1, df1a, lang)
    stats2 = _stock_stats(closes2, df2a, lang)

    if lang == 'en':
        interpretation = _generate_interpretation_en(name1, stats1, name2, stats2, correlation, price_similarity, len(common_dates))
    else:
        interpretation = _generate_interpretation_zh(name1, stats1, name2, stats2, correlation, price_similarity, len(common_dates))

    return {
        "correlation": correlation,
        "price_similarity": price_similarity,
        "trading_days": len(common_dates),
        "stock1": {"name": name1, **stats1},
        "stock2": {"name": name2, **stats2},
        "interpretation": interpretation,
    }

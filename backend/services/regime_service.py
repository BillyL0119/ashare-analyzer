import numpy as np
import pandas as pd
from typing import List


# ── Regime classification ─────────────────────────────────────────────────────

REGIMES = {
    "bull":    {"zh": "牛市", "en": "Bull"},
    "bear":    {"zh": "熊市", "en": "Bear"},
    "sideways":{"zh": "震荡", "en": "Sideways"},
    "crisis":  {"zh": "危机", "en": "Crisis"},
}

REGIME_COLORS = {
    "bull":     "#ef5350",   # red (up, China convention)
    "bear":     "#26a69a",   # green (down)
    "sideways": "#ff9800",   # orange
    "crisis":   "#ab47bc",   # purple
}


def _classify_regime(
    roll_return: float,
    roll_vol: float,
    drawdown: float,
    vol_threshold: float,
    return_threshold: float,
) -> str:
    """Single-bar regime classification."""
    if drawdown < -0.20 and roll_vol > vol_threshold * 1.5:
        return "crisis"
    if roll_return > return_threshold and roll_vol <= vol_threshold * 1.3:
        return "bull"
    if roll_return < -return_threshold:
        return "bear"
    return "sideways"


def detect_regimes(df: pd.DataFrame, window: int = 20) -> dict:
    """
    Detect market regimes for each trading day.
    Returns per-day labels, regime statistics, current regime, and transition history.
    """
    closes = np.array(df["close"].tolist(), dtype=float)
    dates = df["date"].tolist()
    n = len(closes)

    if n < window + 5:
        return {"error": "Insufficient data for regime detection"}

    log_rets = np.diff(np.log(closes))
    # Pad so lengths match
    log_rets_padded = np.concatenate([[np.nan], log_rets])

    # Rolling metrics (centered at bar i, lookback = window)
    roll_ret = np.full(n, np.nan)
    roll_vol = np.full(n, np.nan)
    drawdown = np.full(n, np.nan)

    running_peak = closes[0]
    for i in range(n):
        if closes[i] > running_peak:
            running_peak = closes[i]
        drawdown[i] = (closes[i] - running_peak) / running_peak

        if i >= window:
            window_rets = log_rets[i - window:i]
            roll_ret[i] = float(np.sum(window_rets))          # cumulative log return
            roll_vol[i] = float(np.std(window_rets) * np.sqrt(252))

    # Thresholds based on full-sample statistics (skip NaNs)
    valid_vol = roll_vol[~np.isnan(roll_vol)]
    valid_ret = roll_ret[~np.isnan(roll_ret)]
    vol_threshold = float(np.median(valid_vol)) if len(valid_vol) > 0 else 0.25
    return_threshold = float(np.percentile(np.abs(valid_ret), 60)) if len(valid_ret) > 0 else 0.05

    # Classify each bar
    labels = []
    for i in range(n):
        if np.isnan(roll_ret[i]):
            labels.append(None)
        else:
            labels.append(_classify_regime(roll_ret[i], roll_vol[i], drawdown[i], vol_threshold, return_threshold))

    # ── Regime statistics ──────────────────────────────────────────────────────
    regime_counts = {k: 0 for k in REGIMES}
    regime_returns = {k: [] for k in REGIMES}

    for i in range(1, n):
        r = labels[i]
        if r is None:
            continue
        regime_counts[r] += 1
        if not np.isnan(log_rets[i - 1]):
            regime_returns[r].append(log_rets[i - 1])

    total_labeled = sum(regime_counts.values())
    regime_stats = {}
    for k in REGIMES:
        cnt = regime_counts[k]
        rets = np.array(regime_returns[k]) if regime_returns[k] else np.array([0.0])
        regime_stats[k] = {
            "days": cnt,
            "pct": round(cnt / total_labeled * 100, 1) if total_labeled > 0 else 0,
            "avg_daily_return": round(float(rets.mean() * 100), 4),
            "volatility": round(float(rets.std() * np.sqrt(252) * 100), 2),
            "color": REGIME_COLORS[k],
        }

    # ── Transition history (last 10 regime changes) ────────────────────────────
    transitions = []
    prev = None
    regime_start = 0
    for i, r in enumerate(labels):
        if r is None:
            continue
        if r != prev:
            if prev is not None:
                transitions.append({
                    "regime": prev,
                    "start_date": dates[regime_start],
                    "end_date": dates[i - 1],
                    "duration": i - regime_start,
                    "return_pct": round((closes[i - 1] / closes[regime_start] - 1) * 100, 2),
                })
            prev = r
            regime_start = i
    # Last open regime
    if prev is not None:
        transitions.append({
            "regime": prev,
            "start_date": dates[regime_start],
            "end_date": dates[-1],
            "duration": n - regime_start,
            "return_pct": round((closes[-1] / closes[regime_start] - 1) * 100, 2),
        })

    recent_transitions = transitions[-12:]

    # ── Current regime ─────────────────────────────────────────────────────────
    current_regime = labels[-1]
    current_duration = 0
    for r in reversed(labels):
        if r == current_regime:
            current_duration += 1
        else:
            break

    # ── Series for chart (one label per day) ──────────────────────────────────
    series = [
        {
            "date": dates[i],
            "regime": labels[i],
            "close": round(float(closes[i]), 3),
            "roll_ret": round(float(roll_ret[i] * 100), 4) if not np.isnan(roll_ret[i]) else None,
            "roll_vol": round(float(roll_vol[i] * 100), 4) if not np.isnan(roll_vol[i]) else None,
            "drawdown": round(float(drawdown[i] * 100), 4),
        }
        for i in range(n)
    ]

    # ── Regime signal interpretation ───────────────────────────────────────────
    interpretation = _generate_interpretation(current_regime, current_duration, regime_stats, recent_transitions)

    return {
        "window": window,
        "current_regime": current_regime,
        "current_duration_days": current_duration,
        "regime_stats": regime_stats,
        "transitions": recent_transitions,
        "series": series,
        "interpretation": interpretation,
    }


def _generate_interpretation(regime, duration, stats, transitions) -> dict:
    bull = stats["bull"]
    bear = stats["bear"]
    side = stats["sideways"]
    crisis = stats["crisis"]

    zh_lines = []
    en_lines = []

    # Current state
    zh_lines.append(f"当前市场处于 **{REGIMES[regime]['zh']}** 状态，已持续 **{duration}** 个交易日。")
    en_lines.append(f"The market is currently in a **{REGIMES[regime]['en']}** regime, lasting **{duration}** trading days.")

    # Regime breakdown
    zh_lines.append(
        f"在分析区间内，牛市占比 **{bull['pct']}%**（{bull['days']}日），"
        f"熊市占比 **{bear['pct']}%**（{bear['days']}日），"
        f"震荡占比 **{side['pct']}%**（{side['days']}日），"
        f"危机占比 **{crisis['pct']}%**（{crisis['days']}日）。"
    )
    en_lines.append(
        f"Over the analysis period: Bull **{bull['pct']}%** ({bull['days']}d), "
        f"Bear **{bear['pct']}%** ({bear['days']}d), "
        f"Sideways **{side['pct']}%** ({side['days']}d), "
        f"Crisis **{crisis['pct']}%** ({crisis['days']}d)."
    )

    # Performance in each regime
    zh_lines.append(
        f"各状态平均日收益：牛市 **{bull['avg_daily_return']:+.3f}%**，"
        f"熊市 **{bear['avg_daily_return']:+.3f}%**，"
        f"震荡 **{side['avg_daily_return']:+.3f}%**，"
        f"危机 **{crisis['avg_daily_return']:+.3f}%**。"
    )
    en_lines.append(
        f"Avg daily return per regime: Bull **{bull['avg_daily_return']:+.3f}%**, "
        f"Bear **{bear['avg_daily_return']:+.3f}%**, "
        f"Sideways **{side['avg_daily_return']:+.3f}%**, "
        f"Crisis **{crisis['avg_daily_return']:+.3f}%**."
    )

    # Last transition
    if len(transitions) >= 2:
        prev = transitions[-2]
        zh_lines.append(f"上一轮 **{REGIMES[prev['regime']]['zh']}** 历时 {prev['duration']} 天，区间涨跌 **{prev['return_pct']:+.2f}%**。")
        en_lines.append(f"The previous **{REGIMES[prev['regime']]['en']}** phase lasted {prev['duration']} days with a return of **{prev['return_pct']:+.2f}%**.")

    return {"zh": "\n\n".join(zh_lines), "en": "\n\n".join(en_lines)}

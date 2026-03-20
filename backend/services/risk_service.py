import numpy as np
import pandas as pd
from scipy import stats


def _log_returns(closes: list) -> np.ndarray:
    arr = np.array(closes, dtype=float)
    return np.diff(np.log(arr))


def _pct_returns(closes: list) -> np.ndarray:
    arr = np.array(closes, dtype=float)
    return np.diff(arr) / arr[:-1]


# ── VaR / CVaR ────────────────────────────────────────────────────────────────

def calc_var_cvar(returns: np.ndarray, confidence_levels=(0.95, 0.99)) -> dict:
    result = {}
    for cl in confidence_levels:
        key = int(cl * 100)
        # Historical
        h_var = float(np.percentile(returns, (1 - cl) * 100))
        h_cvar = float(returns[returns <= h_var].mean()) if (returns <= h_var).any() else h_var
        # Parametric (normal)
        mu, sigma = returns.mean(), returns.std()
        p_var = float(mu + sigma * stats.norm.ppf(1 - cl))
        p_cvar = float(mu - sigma * stats.norm.pdf(stats.norm.ppf(1 - cl)) / (1 - cl))
        result[key] = {
            "hist_var": round(h_var * 100, 4),
            "hist_cvar": round(h_cvar * 100, 4),
            "param_var": round(p_var * 100, 4),
            "param_cvar": round(p_cvar * 100, 4),
        }
    return result


# ── Drawdown ───────────────────────────────────────────────────────────────────

def calc_drawdowns(closes: list) -> dict:
    arr = np.array(closes, dtype=float)
    peak = np.maximum.accumulate(arr)
    dd_series = (arr - peak) / peak * 100  # in percent, negative values

    max_dd = float(dd_series.min())
    current_dd = float(dd_series[-1])
    avg_dd = float(dd_series[dd_series < 0].mean()) if (dd_series < 0).any() else 0.0

    # Drawdown duration: count consecutive bars where dd < 0
    in_dd = dd_series < 0
    max_duration = 0
    current_duration = 0
    cur_dur = 0
    for v in in_dd:
        if v:
            cur_dur += 1
            max_duration = max(max_duration, cur_dur)
        else:
            cur_dur = 0
    # Current duration
    cur_dur2 = 0
    for v in reversed(in_dd):
        if v:
            cur_dur2 += 1
        else:
            break
    current_duration = cur_dur2

    # Recovery factor
    total_return = (arr[-1] - arr[0]) / arr[0] * 100
    recovery_factor = round(total_return / abs(max_dd), 2) if max_dd != 0 else None

    return {
        "max_drawdown": round(max_dd, 4),
        "current_drawdown": round(current_dd, 4),
        "avg_drawdown": round(avg_dd, 4),
        "max_duration_days": int(max_duration),
        "current_duration_days": int(current_duration),
        "recovery_factor": recovery_factor,
        "series": [round(float(v), 4) for v in dd_series],
    }


# ── Tail risk ─────────────────────────────────────────────────────────────────

def calc_tail_metrics(returns: np.ndarray, closes: list) -> dict:
    ann = 252
    mu = float(returns.mean())
    sigma = float(returns.std())

    # Annualised
    ann_return = (1 + mu) ** ann - 1
    ann_vol = sigma * np.sqrt(ann)

    skewness = float(stats.skew(returns))
    kurt = float(stats.kurtosis(returns))  # excess kurtosis

    # Sortino (downside deviation)
    downside = returns[returns < 0]
    downside_std = float(np.sqrt((downside ** 2).mean())) if len(downside) > 0 else sigma
    sortino = float((mu * ann) / (downside_std * np.sqrt(ann))) if downside_std > 0 else 0.0

    # Calmar
    arr = np.array(closes, dtype=float)
    peak = np.maximum.accumulate(arr)
    dd_series = (arr - peak) / peak
    max_dd = float(dd_series.min())
    calmar = float(ann_return / abs(max_dd)) if max_dd != 0 else None

    # Sharpe
    sharpe = float((mu * ann) / ann_vol) if ann_vol > 0 else 0.0

    # Omega ratio (return above 0 threshold)
    gains = returns[returns > 0].sum()
    losses = abs(returns[returns < 0].sum())
    omega = float(gains / losses) if losses > 0 else None

    # Tail ratio (95th / 5th percentile magnitudes)
    p95 = abs(float(np.percentile(returns, 95)))
    p5 = abs(float(np.percentile(returns, 5)))
    tail_ratio = round(p95 / p5, 4) if p5 > 0 else None

    return {
        "ann_return": round(ann_return * 100, 4),
        "ann_volatility": round(ann_vol * 100, 4),
        "sharpe": round(sharpe, 4),
        "sortino": round(sortino, 4),
        "calmar": round(calmar, 4) if calmar is not None else None,
        "omega": round(omega, 4) if omega is not None else None,
        "tail_ratio": tail_ratio,
        "skewness": round(skewness, 4),
        "kurtosis": round(kurt, 4),
        "win_rate": round(float((returns > 0).mean() * 100), 2),
        "avg_gain": round(float(returns[returns > 0].mean() * 100), 4) if (returns > 0).any() else 0.0,
        "avg_loss": round(float(returns[returns < 0].mean() * 100), 4) if (returns < 0).any() else 0.0,
        "best_day": round(float(returns.max() * 100), 4),
        "worst_day": round(float(returns.min() * 100), 4),
    }


# ── Stress tests ──────────────────────────────────────────────────────────────

def calc_stress_tests(returns: np.ndarray, current_price: float) -> list:
    scenarios = [
        {"name_zh": "轻度下跌", "name_en": "Mild Drop", "shock": -0.10},
        {"name_zh": "中度下跌", "name_en": "Moderate Drop", "shock": -0.20},
        {"name_zh": "重度下跌", "name_en": "Severe Drop", "shock": -0.30},
        {"name_zh": "极端崩盘", "name_en": "Market Crash", "shock": -0.50},
        {"name_zh": "2008金融危机", "name_en": "2008 Crisis", "shock": -0.65},
        {"name_zh": "温和上涨", "name_en": "Mild Rally", "shock": +0.10},
        {"name_zh": "强势上涨", "name_en": "Bull Run", "shock": +0.30},
    ]

    sigma = float(returns.std())
    mu = float(returns.mean())
    results = []

    for s in scenarios:
        shock = s["shock"]
        stressed_price = current_price * (1 + shock)
        # Days to reach shock level at historical drift
        if mu != 0 and mu * shock > 0:
            days = round(abs(shock) / abs(mu))
        else:
            days = None
        # Probability under normal distribution (1-day VaR comparison)
        z_score = round(shock / sigma, 2) if sigma > 0 else None
        prob = round(float(stats.norm.cdf(shock / sigma) if shock < 0 else 1 - stats.norm.cdf(shock / sigma)) * 100, 2) if sigma > 0 else None

        results.append({
            "name_zh": s["name_zh"],
            "name_en": s["name_en"],
            "shock_pct": round(shock * 100, 1),
            "stressed_price": round(stressed_price, 3),
            "z_score": z_score,
            "prob_pct": prob,
        })
    return results


# ── Return distribution (histogram buckets) ───────────────────────────────────

def calc_return_distribution(returns: np.ndarray, bins: int = 40) -> dict:
    counts, edges = np.histogram(returns * 100, bins=bins)
    centers = [(edges[i] + edges[i + 1]) / 2 for i in range(len(edges) - 1)]
    return {
        "centers": [round(float(c), 4) for c in centers],
        "counts": [int(c) for c in counts],
    }


# ── Main entry ────────────────────────────────────────────────────────────────

def analyze_risk(df: pd.DataFrame) -> dict:
    closes = df["close"].tolist()
    if len(closes) < 20:
        return {"error": "Insufficient data for risk analysis (need 20+ days)"}

    returns = _pct_returns(closes)
    current_price = closes[-1]

    var_cvar = calc_var_cvar(returns)
    drawdowns = calc_drawdowns(closes)
    tail = calc_tail_metrics(returns, closes)
    stress = calc_stress_tests(returns, current_price)
    distribution = calc_return_distribution(returns)

    return {
        "current_price": round(current_price, 3),
        "trading_days": len(closes),
        "var_cvar": var_cvar,
        "drawdowns": {k: v for k, v in drawdowns.items() if k != "series"},
        "drawdown_series": drawdowns["series"],
        "tail_metrics": tail,
        "stress_tests": stress,
        "distribution": distribution,
    }

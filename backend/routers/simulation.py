from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from services.stock_service import get_stock_history
import numpy as np
import math

router = APIRouter()


class SimulationRequest(BaseModel):
    days: int = 252
    simulations: int = 1000


def _safe_float(val):
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 6)
    except (TypeError, ValueError):
        return None


@router.post("/{code}")
def run_simulation(code: str, body: SimulationRequest):
    days = max(1, min(body.days, 1260))
    simulations = max(100, min(body.simulations, 5000))

    end = datetime.now().strftime("%Y%m%d")
    start = (datetime.now() - timedelta(days=365 * 3)).strftime("%Y%m%d")

    df = get_stock_history(code, "daily", start, end, "qfq")
    if df is None or df.empty:
        df = get_stock_history(code, "daily", "19900101", end, "qfq")
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"{code} 暂无数据")

    close = df["close"].values
    if len(close) < 10:
        raise HTTPException(status_code=400, detail="历史数据不足，无法进行模拟")

    log_returns = np.diff(np.log(close))
    mu = np.mean(log_returns)
    sigma = np.std(log_returns)
    current_price = float(close[-1])

    # Monte Carlo simulation
    rng = np.random.default_rng(42)
    rand_returns = rng.normal(mu, sigma, (simulations, days))
    price_paths = current_price * np.exp(np.cumsum(rand_returns, axis=1))

    # Insert current price at the start
    start_col = np.full((simulations, 1), current_price)
    price_paths = np.concatenate([start_col, price_paths], axis=1)

    # Compute percentile paths
    percentiles = [10, 25, 50, 75, 90]
    pct_paths = {}
    for p in percentiles:
        pct_paths[f"p{p}"] = np.percentile(price_paths, p, axis=0).tolist()

    # Final price distribution
    final_prices = price_paths[:, -1]
    prob_gain = float(np.mean(final_prices > current_price))
    expected_return = float(np.mean((final_prices - current_price) / current_price))
    std_return = float(np.std((final_prices - current_price) / current_price))
    var_95 = float(np.percentile(final_prices, 5))
    var_95_pct = float((var_95 - current_price) / current_price)

    # Build time axis labels (trading days from today)
    time_labels = list(range(days + 1))

    return {
        "code": code,
        "current_price": _safe_float(current_price),
        "days": days,
        "simulations": simulations,
        "mu": _safe_float(mu),
        "sigma": _safe_float(sigma),
        "time_labels": time_labels,
        "paths": {k: [_safe_float(v) for v in vals] for k, vals in pct_paths.items()},
        "stats": {
            "expected_return": _safe_float(expected_return),
            "std_return": _safe_float(std_return),
            "prob_gain": _safe_float(prob_gain),
            "var_95_price": _safe_float(var_95),
            "var_95_pct": _safe_float(var_95_pct),
            "min_price": _safe_float(float(np.min(final_prices))),
            "max_price": _safe_float(float(np.max(final_prices))),
            "median_price": _safe_float(float(np.median(final_prices))),
        },
    }

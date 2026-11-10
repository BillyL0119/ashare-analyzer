"""Monte Carlo price ranges: POST /api/simulation/{code}?market=cn|us|hk|jp

The model is in services/monte_carlo.py (GJR-GARCH volatility, the stock's own past shocks). The web
panel and the iOS app both call this; without `market`, a numeric code is an A-share and anything
else a US ticker (what the iOS app relies on).

Prices are total-return daily closes for about three years: Sina's ratio-adjusted series for
A-shares, Tencent's forward-adjusted series for US stocks (by ratio), and for Hong Kong Tencent's
unadjusted series adjusted here (services/total_return.py), because its forward-adjusted Hong Kong
series subtracts dividends and would overstate volatility.
"""
import math
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services import monte_carlo as mc
from services.stock_service import get_stock_history

router = APIRouter()

WINDOW = 756            # trading days of history the model learns from (about three years)
MIN_PATHS, MAX_PATHS = 5000, 20000    # fewer paths leave visible noise in the outer percentiles


class SimulationRequest(BaseModel):
    days: int = 252
    simulations: int = 1000
    seed: int = 42          # the same seed gives the same paths; "run again" on the site sends another


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


def _closes(code: str, market: str) -> list:
    """Adjusted daily closes, oldest first, for about the last three years."""
    if market == "cn":
        end = datetime.now().strftime("%Y%m%d")
        start = (datetime.now() - timedelta(days=365 * 3 + 30)).strftime("%Y%m%d")
        df = get_stock_history(code, "daily", start, end, "qfq")
        return [] if df is None or df.empty else [float(c) for c in df["close"]]
    if market == "us":
        from routers.us_stocks import _tencent_history
        sym = code.upper().replace("-", ".")
        if len(sym) > 10 or not sym.replace(".", "").isalnum():
            return []
        closes = [c["close"] for c in _tencent_history(sym, 365 * 3)]
        if closes and min(closes) <= 0:
            # A forward-adjusted series that goes to zero or below is broken (its dividends were
            # subtracted, not scaled): rebuild it from the unadjusted rows.
            from routers.us_stocks import _TENCENT_SUFFIX
            from services.total_return import adjust, tencent_raw_rows
            rows = tencent_raw_rows(f"us{sym}{_TENCENT_SUFFIX.get(sym, '.OQ')}", WINDOW + 60)
            closes = [c["close"] for c in adjust(rows, "us")]
        return closes
    from routers.global_stocks import history, normalize_code
    code = normalize_code(market, code)
    if market == "hk":
        from services.total_return import hk_candles
        return [c["close"] for c in hk_candles(code, WINDOW + 60)]
    return [c["close"] for c in history(market, code, 1100) if c.get("close")]


@router.post("/{code}")
def run_simulation(code: str, body: SimulationRequest, market: Optional[str] = Query(None)):
    days = max(1, min(body.days, 1260))
    simulations = max(MIN_PATHS, min(body.simulations, MAX_PATHS))
    if market not in ("cn", "us", "hk", "jp"):
        market = "cn" if code.isdigit() else "us"

    try:
        closes = _closes(code, market)
    except HTTPException:
        raise
    except Exception:
        closes = []
    if not closes:
        raise HTTPException(status_code=404, detail=f"{code} 暂无数据")
    r = mc.log_returns(closes[-(WINDOW + 1):])
    if len(r) < 60:
        raise HTTPException(status_code=400, detail="历史数据不足，无法进行模拟")
    current_price = float(closes[-1])

    sim = mc.simulate(r, days, simulations, market, code, seed=abs(int(body.seed)) % 1_000_000)
    fit = sim["fit"]
    paths = {}
    for i, p in enumerate(mc.PERCENTILES):
        paths[f"p{p}"] = [_safe_float(current_price)] + [_safe_float(current_price * math.exp(x)) for x in sim["pct"][:, i]]

    final_prices = current_price * np.exp(sim["final"])
    gains = final_prices / current_price - 1
    var_95 = float(np.percentile(final_prices, 5))
    return {
        "code": code,
        "market": market,
        "model": "gjr_garch_fhs",
        "current_price": _safe_float(current_price),
        "days": days,
        "simulations": simulations,
        "mu": _safe_float(sim["mu"]),
        "mu_hist": _safe_float(float(r.mean())),
        "prior_annual": mc.PRIOR_ANNUAL.get(market, 0.06),
        "hist_weight": mc.HIST_WEIGHT,
        "sigma": _safe_float(math.sqrt(fit["var_lr"])),                       # long-run daily volatility
        "vol_now_annual": _safe_float(math.sqrt(fit["var_next"] * 252)),
        "vol_longrun_annual": _safe_float(math.sqrt(fit["var_lr"] * 252)),
        "persistence": _safe_float(fit["persistence"]),
        "asymmetry": _safe_float(fit["gamma"]),                               # extra weight a falling day gets
        "history_days": int(len(r)),
        "backtest": mc.BACKTEST.get(market) or mc.BACKTEST.get("all"),
        "time_labels": list(range(days + 1)),
        "paths": paths,
        "stats": {
            "expected_return": _safe_float(float(gains.mean())),
            "std_return": _safe_float(float(gains.std())),
            "prob_gain": _safe_float(float(np.mean(final_prices > current_price))),
            "var_95_price": _safe_float(var_95),
            "var_95_pct": _safe_float(var_95 / current_price - 1),
            "min_price": _safe_float(float(final_prices.min())),
            "max_price": _safe_float(float(final_prices.max())),
            "median_price": _safe_float(float(np.median(final_prices))),
        },
    }

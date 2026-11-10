"""
Monte Carlo price ranges for one stock (routers/simulation.py), built from its own last three years of
daily total returns:

- Volatility follows a GJR-GARCH(1,1) process fitted to those returns. The near term starts from
  today's volatility (calm or stormy, as the recent past says), longer horizons drift back to the
  stock's long-run level, and a falling day raises volatility more than a rising one where the
  stock's history shows that. A bell curve with one fixed volatility misses all three.
- Each day's shock is drawn from the stock's own past shocks, each rescaled by how volatile its own
  day was (filtered historical simulation), so fat tails and lopsided moves stay in.
- Drift: 25% the stock's own past return and 75% a long-run market return (PRIOR_ANNUAL), because a
  stock's past return says little about its future one.
- A-shares cannot move past their daily price limit.

What "accurate" means here: nobody can say which way a price will go, so the test is whether the
bands are honest. tools/backtest_monte_carlo.py replays about 20 years of real prices for 111 US,
A-share and Hong Kong stocks and indices: a forecast every month from what was known that day,
checked against what happened 1 week to 1 year later. The 80% band (P10–P90) should hold the real
price 80% of the time; BACKTEST has what it measured. The choices above (GJR over plain GARCH, past
shocks over a bell curve, the 3-year window, the drift weights) were made by comparing variants on
those start dates, with the ones from 2016 on held back as a check.
"""
from math import log, sqrt
from typing import Optional

import numpy as np

HIST_WEIGHT = 0.25
# Long-run average yearly return of each stock market (arithmetic, dividends included). The US figure
# is the usual "about 10% a year"; over 2003–2026 the broad index funds in the backtest averaged 12–13%
# in the US and about 9–11% in mainland China and Hong Kong, so these lean cautious.
PRIOR_ANNUAL = {"us": 0.10, "cn": 0.07, "hk": 0.07, "jp": 0.07}
PERCENTILES = (5, 10, 25, 50, 75, 90, 95)
MAX_ABS_RETURN = 0.5          # a daily log move beyond ±50% is a split or a bad tick, not a return
SPIKE = 0.3                   # ... and so is a move this large that reverses the next day

# Variance targeting: the long-run variance is the sample variance; (alpha, gamma, beta) maximise the
# Gaussian likelihood over this grid. A grid is slower than an optimiser but cannot fail to converge.
# The gamma = 0 rows are plain GARCH, so a stock whose history shows no asymmetry gets none.
_GRID = np.array([(a, g, b) for a in (0.0, 0.02, 0.04, 0.06, 0.08, 0.12) for g in (0.0, 0.04, 0.08, 0.12, 0.16, 0.20)
                  for b in np.arange(0.70, 0.985, 0.02) if 0 < a + g and a + g / 2 + b < 0.995])


def clean_mask(r: np.ndarray) -> np.ndarray:
    """Which daily log returns to keep: not a split-sized jump, and not a one-day bad price (a jump of
    over 30% that is undone the next day)."""
    keep = np.isfinite(r) & (np.abs(r) <= MAX_ABS_RETURN)
    if len(r) > 1:
        spike = (np.abs(r[:-1]) > SPIKE) & (np.abs(r[:-1] + r[1:]) < 0.05)
        keep[:-1] &= ~spike
        keep[1:] &= ~spike
    return keep


def log_returns(closes) -> np.ndarray:
    """Cleaned daily log returns of positive closes."""
    c = np.asarray([x for x in closes if x and x > 0], dtype=float)
    r = np.diff(np.log(c))
    return r[clean_mask(r)]


def fit_garch(r: np.ndarray) -> dict:
    """GJR-GARCH(1,1) on demeaned returns: v' = omega + (alpha + gamma*[shock < 0]) * shock^2 + beta * v.
    Returns the parameters, the long-run daily variance, the variance expected for tomorrow, and the
    standardised past shocks (mean 0, variance 1)."""
    e = r - r.mean()
    var_lr = float(e.var())
    a, g, b = _GRID[:, 0], _GRID[:, 1], _GRID[:, 2]
    omega = var_lr * (1 - a - g / 2 - b)
    v = np.full(len(_GRID), var_lr)
    ll = np.zeros(len(_GRID))
    for x in e:
        ll -= np.log(v) + x * x / v
        v = omega + (a + (g if x < 0 else 0.0)) * (x * x) + b * v
    k = int(np.argmax(ll))
    alpha, gamma, beta = float(a[k]), float(g[k]), float(b[k])
    w = var_lr * (1 - alpha - gamma / 2 - beta)
    vt = var_lr
    z = np.empty(len(e))
    for i, x in enumerate(e):
        z[i] = x / sqrt(vt)
        vt = w + (alpha + (gamma if x < 0 else 0.0)) * x * x + beta * vt
    z = (z - z.mean()) / z.std()
    return {"alpha": alpha, "gamma": gamma, "beta": beta, "omega": w, "var_lr": var_lr, "var_next": float(vt),
            "persistence": alpha + gamma / 2 + beta, "z": z}


def daily_limit(market: str, code: str) -> Optional[float]:
    """Largest daily log move allowed: A-share main board ±10%, ChiNext and STAR ±20%."""
    if market != "cn" or not code.isdigit():
        return None
    return log(1.2) if code.startswith(("300", "301", "688", "689")) else log(1.1)


def drift(r: np.ndarray, var_lr: float, market: str) -> float:
    prior = PRIOR_ANNUAL.get(market, 0.07) / 252 - var_lr / 2      # arithmetic -> log drift
    return HIST_WEIGHT * float(r.mean()) + (1 - HIST_WEIGHT) * prior


def simulate(r: np.ndarray, days: int, n: int, market: str, code: str = "", seed: Optional[int] = 42,
             fit: Optional[dict] = None) -> dict:
    """Simulate n paths of `days` trading days of log price change. Returns the percentiles of the log
    change for each day (shape days x 7, PERCENTILES order), the share of paths above today's price for
    each day, and the final log changes."""
    fit = fit or fit_garch(r)
    mu = drift(r, fit["var_lr"], market)
    lim = daily_limit(market, code)
    rng = np.random.default_rng(seed)
    z, alpha, gamma, beta, omega = fit["z"], fit["alpha"], fit["gamma"], fit["beta"], fit["omega"]
    v = np.full(n, fit["var_next"])
    logp = np.zeros(n)
    pct = np.empty((days, len(PERCENTILES)))
    up = np.empty(days)
    for t in range(days):
        eps = np.sqrt(v) * z[rng.integers(0, len(z), n)]
        step = mu + eps
        if lim is not None:
            step = np.clip(step, -lim, lim)
        logp += step
        pct[t] = np.percentile(logp, PERCENTILES)
        up[t] = float(np.mean(logp > 0))
        v = omega + (alpha + gamma * (eps < 0)) * eps * eps + beta * v
    return {"pct": pct, "up": up, "final": logp, "fit": fit, "mu": mu}


# Printed by tools/backtest_monte_carlo.py (run 2026-11-10): the share of real outcomes inside the
# P25–P75, P10–P90 and P5–P95 bands (ideal 50, 80, 90) by horizon in trading days, over monthly start
# dates. The model before it (one fixed volatility, bell-curve shocks) put 59% inside its "50%" band
# at one week and 85% inside its "80%" band, and its pinball loss was 1.6–2.8% higher at every horizon.
BACKTEST: dict = {
    "all": {"stocks": 111, "years": "2006–2025", "h": {
        "5": {"cov50": 51, "cov80": 81, "cov90": 90, "n": 20837}, "21": {"cov50": 51, "cov80": 81, "cov90": 90, "n": 20837},
        "63": {"cov50": 52, "cov80": 81, "cov90": 90, "n": 20837}, "126": {"cov50": 52, "cov80": 81, "cov90": 90, "n": 20837},
        "252": {"cov50": 52, "cov80": 80, "cov90": 89, "n": 20837}}},
    "cn": {"stocks": 45, "years": "2007–2025", "h": {
        "5": {"cov50": 51, "cov80": 81, "cov90": 90, "n": 7907}, "21": {"cov50": 51, "cov80": 80, "cov90": 90, "n": 7907},
        "63": {"cov50": 52, "cov80": 80, "cov90": 89, "n": 7907}, "126": {"cov50": 51, "cov80": 80, "cov90": 89, "n": 7907},
        "252": {"cov50": 50, "cov80": 78, "cov90": 87, "n": 7907}}},
    "hk": {"stocks": 20, "years": "2006–2025", "h": {
        "5": {"cov50": 49, "cov80": 78, "cov90": 88, "n": 4429}, "21": {"cov50": 50, "cov80": 80, "cov90": 89, "n": 4429},
        "63": {"cov50": 50, "cov80": 80, "cov90": 89, "n": 4429}, "126": {"cov50": 48, "cov80": 77, "cov90": 88, "n": 4429},
        "252": {"cov50": 50, "cov80": 78, "cov90": 87, "n": 4429}}},
    "us": {"stocks": 46, "years": "2006–2025", "h": {
        "5": {"cov50": 51, "cov80": 81, "cov90": 91, "n": 8501}, "21": {"cov50": 51, "cov80": 82, "cov90": 91, "n": 8501},
        "63": {"cov50": 52, "cov80": 83, "cov90": 92, "n": 8501}, "126": {"cov50": 55, "cov80": 84, "cov90": 92, "n": 8501},
        "252": {"cov50": 55, "cov80": 83, "cov90": 91, "n": 8501}}},
}

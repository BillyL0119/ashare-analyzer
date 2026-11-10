"""The Monte Carlo model (services/monte_carlo.py): cleaning, the GARCH fit and the simulated ranges.
Pure numpy, no network."""
import math

import numpy as np
import pytest

from services import monte_carlo as mc


def garch_series(n=900, alpha=0.08, beta=0.90, sd=0.02, seed=3, calm_tail=0, stormy_tail=0):
    rng = np.random.default_rng(seed)
    lr = sd * sd
    w = lr * (1 - alpha - beta)
    v, out = lr, []
    for i in range(n):
        scale = 0.4 if i >= n - calm_tail else 2.5 if i >= n - stormy_tail else 1.0
        e = math.sqrt(v) * rng.standard_normal() * scale
        out.append(e)
        v = w + alpha * e * e + beta * v
    return np.array(out)


def test_log_returns_drop_bad_ticks_and_splits():
    closes = [10, 10.5, None, 0, 10.2, 5.1, 5.2]          # a 2-for-1 split between 10.2 and 5.1
    r = mc.log_returns(closes)
    assert len(r) == 3 and np.all(np.abs(r) < 0.5)                 # the split day is gone


def test_garch_fit_finds_persistence_and_standardises_shocks():
    r = garch_series()
    fit = mc.fit_garch(r)
    assert 0.9 <= fit["persistence"] < 0.995
    assert fit["persistence"] == fit["alpha"] + fit["gamma"] / 2 + fit["beta"]
    assert abs(fit["var_lr"] - r.var()) < 1e-9
    assert abs(fit["z"].mean()) < 1e-9 and abs(fit["z"].std() - 1) < 1e-9


def test_fit_finds_asymmetry_only_where_there_is_some():
    # falls raise volatility three times as much as rises
    rng = np.random.default_rng(11)
    lr, v, out = 0.015 ** 2, 0.015 ** 2, []
    for _ in range(1500):
        e = math.sqrt(v) * rng.standard_normal()
        out.append(e)
        v = lr * (1 - 0.03 - 0.06 - 0.88) + (0.03 + (0.12 if e < 0 else 0.0)) * e * e + 0.88 * v
    assert mc.fit_garch(np.array(out))["gamma"] >= 0.08
    assert mc.fit_garch(garch_series(n=1500))["gamma"] <= 0.04          # symmetric series


def test_one_day_bad_price_is_removed():
    closes = [100, 101, 66, 100.5, 101, 80, 81]            # 66 is a bad tick; the fall to 80 is real
    r = mc.log_returns(closes)
    assert len(r) == 4 and min(r) == pytest.approx(math.log(80 / 101))


def test_stormy_recent_days_widen_the_near_term_range():
    calm = mc.simulate(garch_series(calm_tail=40), 5, 2000, "us")
    stormy = mc.simulate(garch_series(stormy_tail=40), 5, 2000, "us")
    width = lambda s: s["pct"][-1][5] - s["pct"][-1][1]      # 10th to 90th percentile at day 5
    assert stormy["fit"]["var_next"] > stormy["fit"]["var_lr"] > 0
    assert width(stormy) > 1.5 * width(calm)


def test_ranges_are_ordered_grow_with_time_and_repeat_with_a_seed():
    r = garch_series()
    a = mc.simulate(r, 120, 1000, "us", seed=5)
    b = mc.simulate(r, 120, 1000, "us", seed=5)
    assert np.array_equal(a["pct"], b["pct"])
    assert np.all(np.diff(a["pct"], axis=1) >= 0)            # p5 <= p10 <= ... <= p95 every day
    assert a["pct"][-1][6] - a["pct"][-1][0] > a["pct"][9][6] - a["pct"][9][0]
    assert 0 <= a["up"].min() and a["up"].max() <= 1


def test_a_share_daily_limit_caps_one_day_moves():
    r = garch_series(sd=0.05)                                 # very volatile, so +-10% days are common
    main = mc.simulate(r, 1, 3000, "cn", "600519")
    star = mc.simulate(r, 1, 3000, "cn", "688981")
    assert main["final"].max() <= math.log(1.1) + 1e-12 and main["final"].min() >= -math.log(1.1) - 1e-12
    assert star["final"].max() > math.log(1.1)                # STAR board allows +-20%
    assert mc.daily_limit("us", "AAPL") is None

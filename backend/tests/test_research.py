"""Research helpers (local tool; skipped where pandas is not installed, e.g. the small CI image)."""
import numpy as np
import pytest

pytest.importorskip("pandas", minversion="1.0")    # the CI stub pandas has no version: skip there
from research.bias_study import holding_return  # noqa: E402


def test_delisting_inside_the_month_earns_up_to_last_trade():
    nan = np.nan
    adj = np.array([[10, 10, 10, nan],       # day i (rebalance); column 3 had no price yet
                    [11, 9, nan, 5],
                    [12, 4, nan, 6],        # col 1 falls to 4, col 2 stopped trading after day i
                    [13, nan, nan, 7]], dtype=np.float32)   # col 1 delisted after day 2
    r = holding_return(adj, 0, 3)
    assert r[0] == pytest.approx(0.3)
    assert r[1] == pytest.approx(-0.6)        # last traded price, not dropped from the average
    assert r[2] == 0.0                        # no later bar at all: no return is invented
    assert np.isnan(r[3])                     # no price at i: not ownable


def test_bankruptcy_style_delisting_is_charged_extra():
    from research.factor_study import delist_adjust
    nan = np.nan
    adj = np.array([[10, 10, 10], [9, 1.5, 9], [8, nan, nan]], dtype=np.float32)
    raw = adj.copy()                                   # no splits here
    raw[1, 2] = 30                                     # col 2 stops trading at $30 (a buy-out)
    dates = np.array([20200131, 20200203, 20200204])
    last_date = np.array([99999999, 20200203, 20200203])
    later = holding_return(adj, 0, 2)
    out = delist_adjust(later, adj, raw, 0, 2, last_date, dates, 0.3)
    assert out[0] == later[0]                          # still trading
    assert out[1] == pytest.approx((1 - 0.85) * 0.7 - 1)   # stopped under $2: 30% more lost
    assert out[2] == later[2]                          # stopped at $30: left alone


def test_drift_holds_shares_between_rebalances():
    from research.portfolio_study import simulate
    n = 60
    months = []
    for k in range(6):
        later = np.zeros(n)
        later[0] = 1.0 if k == 0 else 0.0               # stock 0 doubles in the first month
        later[1] = 0.1 if k == 1 else 0.0               # then stock 1 gains 10%
        sig = {"x": -np.arange(n, dtype=float)}         # stock 0 ranks first
        months.append((20050131 + k * 100, np.ones(n, bool), np.ones(n, bool), sig, later))
    books = {}
    import research.portfolio_study as ps
    ps.choose, orig = (lambda b, u, y, threshold=2.0: {"x": 1.0}), ps.choose
    try:
        kw = dict(sector_neutral=False, ic_weights=False, every=3, keep_pct=0, n_names=2, trend=False,
                  cash_flags=[False] * 6, cost_rate=0.0)
        flat, _ = simulate(books, months, np.zeros(n, int), **kw)
        held, _ = simulate(books, months, np.zeros(n, int), drift=True, **kw)
    finally:
        ps.choose = orig
    assert flat[0][1] == pytest.approx(0.5) and held[0][1] == pytest.approx(0.5)
    # month 2: reset to 50/50 gives 5%; holding the shares (2/3 in stock 0 after it doubled) gives 3.3%
    assert flat[1][1] == pytest.approx(0.05) and held[1][1] == pytest.approx(0.1 / 3)

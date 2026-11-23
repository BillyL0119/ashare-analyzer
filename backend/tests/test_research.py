"""Research helpers (local tool; skipped where pandas is not installed, e.g. the small CI image)."""
import numpy as np
import pytest

pytest.importorskip("pandas")
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

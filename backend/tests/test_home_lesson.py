"""Home panel for CN/HK/JP: the movers are the two biggest gainers and losers, largest move first."""
import stubs
stubs.stub()
from routers.home_lesson import pick_movers  # noqa: E402


def test_pick_movers():
    rows = [{"symbol": s, "pct": p} for s, p in (("A", 1.0), ("B", 5.0), ("C", -7.0), ("D", -0.5), ("E", 3.0), ("F", None), ("G", 0))]
    assert [r["symbol"] for r in pick_movers(rows)] == ["C", "B", "E", "D"]
    assert pick_movers([]) == []

"""Live tracking: the monthly trend decision uses only closed months; reviews keep names still in the top 30%."""
import pytest

pytest.importorskip("pandas", minversion="1.0")
from research import live_track as lt  # noqa: E402


def test_trend_decision_waits_for_the_month_to_close():
    dates = [20260131 + 100 * i for i in range(10)] + [20261120]          # Jan..Oct month-ends, then mid-November
    levels = [100] * 9 + [120, 90]
    d = lt.trend_decisions(levels, dates, "2026-11-20")
    assert d == {"2026-11": True}              # decided from October's close; the November dip decides nothing yet
    d = lt.trend_decisions(levels, dates, "2026-12-02")
    assert d["2026-12"] is False               # November closed below its 10-month average: December in cash


def test_review_keeps_names_in_the_keep_zone(tmp_path, monkeypatch):
    monkeypatch.setattr(lt, "STATE", str(tmp_path / "state.json"))
    monkeypatch.setattr(lt, "summarize", lambda state, *a: state)
    rank = lambda names: [{"ticker": t} for t in names]                    # noqa: E731
    s = lt.update("2026-01-02", rank(["A", "B", "C", "D"]), None, [], [], {}, top_n=2, keep_n=3)
    assert s["holdings"] == ["A", "B"]
    s = lt.update("2026-02-02", rank(["C", "D", "B", "A"]), None, [], [], {}, top_n=2, keep_n=3)
    assert s["holdings"] == ["A", "B"] and len(s["reviews"]) == 1          # too soon for a review
    s = lt.update("2026-04-06", rank(["C", "D", "B", "A"]), None, [], [], {}, top_n=2, keep_n=3)
    assert s["holdings"] == ["B", "C"]                                     # B still in the top 3, A replaced by C
    assert s["reviews"][-1]["sold"] == ["A"] and s["reviews"][-1]["bought"] == ["C"]
    assert [x["date"] for x in s["snapshots"]] == ["2026-01-02", "2026-02-02", "2026-04-06"]

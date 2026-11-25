from services.trend_split_live import live_status

SPLIT = {"anchor_date": "2026-11-20", "parts": [
    {"part": 0, "next_check": "2026-11-30", "last_invested": True, "threshold_ratio": 1.05},
    {"part": 1, "next_check": "2026-12-01", "last_invested": True, "threshold_ratio": 1.0},
    {"part": 2, "next_check": "2026-12-02", "last_invested": False, "threshold_ratio": None},
]}
BARS = [{"date": "2026-11-20", "close": 600.0}, {"date": "2026-11-27", "close": 610.0},
        {"date": "2026-11-30", "close": 620.0}]


def test_threshold_becomes_an_spy_price_and_a_decision_once_spy_closed():
    s = live_status(SPLIT, BARS)
    p0, p1, p2 = s["parts"]
    assert p0["threshold_spy"] == 630.0 and p0["invested"] is False and p0["changes"] is True
    assert p0["trade_on"] == "2026-12-01" and p0["close_call"] is False
    assert p1["threshold_spy"] == 600.0 and "invested" not in p1          # its check day has not closed yet
    assert round(p1["gap_pct"], 2) == 3.33
    assert "threshold_spy" not in p2                                         # too little history: no threshold
    assert s["spy_latest"]["close"] == 620.0


def test_nothing_to_say_without_data():
    assert live_status({}, BARS) == {} and live_status(SPLIT, []) == {}

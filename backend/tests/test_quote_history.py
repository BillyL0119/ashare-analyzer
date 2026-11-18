"""Historical data tab: adjusted close, weekly / monthly bars, ranges, the route. No network."""
import json
import pathlib
from datetime import date

import pytest
from fastapi import HTTPException

from routers import quote_history as qh
from services import nasdaq as nq

FIX = pathlib.Path(__file__).parent / "fixtures" / "nasdaq"


def bar(day, o, h, l, c, v=100):
    return {"date": day, "open": o, "high": h, "low": l, "close": c, "volume": v}


def fixture(name):
    return json.loads((FIX / f"{name}.json").read_text())["data"]


# ── adjusted close ──

def test_adj_close_two_dividends_by_hand():
    rows = [bar("2026-01-02", 1, 1, 1, 100.0), bar("2026-01-05", 1, 1, 1, 102.0), bar("2026-01-06", 1, 1, 1, 98.0),
            bar("2026-01-07", 1, 1, 1, 100.0), bar("2026-01-08", 1, 1, 1, 101.0)]
    divs = [{"ex_date": "2026-01-06", "amount": 2.0},       # previous close 102 -> factor 1 - 2/102
            {"ex_date": "2026-01-08", "amount": 1.0}]       # previous close 100 -> factor 0.99
    f1, f2 = 1 - 2 / 102, 0.99
    out = {r["date"]: r["adj_close"] for r in qh.add_adj_close(rows, divs)}
    assert out["2026-01-08"] == pytest.approx(101.0)                 # ex-date itself: not adjusted
    assert out["2026-01-07"] == pytest.approx(100.0 * f2)
    assert out["2026-01-06"] == pytest.approx(98.0 * f2)             # ex-date of the first: only the later one applies
    assert out["2026-01-05"] == pytest.approx(102.0 * f1 * f2)
    assert out["2026-01-02"] == pytest.approx(100.0 * f1 * f2)


def test_adj_close_ignores_dividends_outside_the_data():
    rows = [bar("2026-01-05", 1, 1, 1, 50.0), bar("2026-01-06", 1, 1, 1, 51.0)]
    divs = [{"ex_date": "2025-12-01", "amount": 1.0},      # before the history: nothing to compare with
            {"ex_date": "2026-02-01", "amount": 1.0}]      # not happened yet in our data
    assert [r["adj_close"] for r in qh.add_adj_close(rows, divs)] == [50.0, 51.0]
    assert qh.add_adj_close([], divs) == []


def test_adj_close_same_ex_date_adds_up():
    rows = [bar("2026-01-05", 1, 1, 1, 100.0), bar("2026-01-06", 1, 1, 1, 100.0)]
    out = qh.add_adj_close(rows, [{"ex_date": "2026-01-06", "amount": 1.0}, {"ex_date": "2026-01-06", "amount": 1.0}])
    assert out[0]["adj_close"] == pytest.approx(98.0)


def test_aapl_adj_close_pattern():
    rows = []
    for r in reversed(fixture("historical")["tradesTable"]["rows"]):
        rows.append(bar(nq.parse_date(r["date"]), nq.num(r["open"]), nq.num(r["high"]), nq.num(r["low"]),
                        nq.num(r["close"]), nq.num(r["volume"])))
    divs = [{"ex_date": nq.parse_date(r["exOrEffDate"]), "amount": nq.num(r["amount"])}
            for r in reversed(fixture("dividends")["dividends"]["rows"])]
    out = qh.add_adj_close(rows, divs)
    last_ex = max(d["ex_date"] for d in divs)
    for r in out:
        assert r["adj_close"] <= r["close"] + 1e-9
        if r["date"] >= last_ex:
            assert r["adj_close"] == pytest.approx(r["close"])
    older = [r for r in out if r["date"] < last_ex]
    assert older and all(r["adj_close"] < r["close"] for r in older)
    assert out[0]["adj_close"] / out[0]["close"] > 0.97              # a year of ~0.4 % yield: slightly below


# ── ranges ──

def test_range_start():
    assert qh.range_start(date(2026, 11, 18), "ytd") == date(2026, 1, 1)
    assert qh.range_start(date(2026, 11, 18), "1m") == date(2026, 10, 18)
    assert qh.range_start(date(2026, 3, 31), "1m") == date(2026, 2, 28)      # clamped to a real day
    assert qh.range_start(date(2026, 11, 18), "1y") == date(2025, 11, 18)
    assert qh.range_start(date(2024, 2, 29), "2y") == date(2022, 2, 28)
    assert qh.range_start(date(2026, 1, 15), "3m") == date(2025, 10, 15)


def test_ytd_starts_with_first_session_of_the_year():
    daily = [bar("2025-12-31", 1, 1, 1, 10.0), bar("2026-01-02", 1, 1, 1, 11.0), bar("2026-01-05", 1, 1, 1, 12.0)]
    b = qh.build_history(daily, [], "ytd", "1d", date(2026, 3, 1))
    assert [r["date"] for r in b["rows"]] == ["2026-01-05", "2026-01-02"]     # newest first
    assert b["from"] == "2026-01-02" and b["to"] == "2026-01-05"


def test_range_boundary_is_inclusive():
    daily = [bar("2026-10-17", 1, 1, 1, 1.0), bar("2026-10-18", 1, 1, 1, 2.0), bar("2026-10-19", 1, 1, 1, 3.0)]
    b = qh.build_history(daily, [], "1m", "1d", date(2026, 11, 18))
    assert [r["date"] for r in b["rows"]] == ["2026-10-19", "2026-10-18"]


# ── aggregation ──

DAILY = [  # Fri Jan 2, then two full weeks, then Mon Feb 2 (a new month)
    bar("2026-01-02", 10, 12, 9, 11, 100), bar("2026-01-05", 11, 15, 10, 14, 200), bar("2026-01-06", 14, 16, 13, 13, 300),
    bar("2026-01-07", 13, 14, 8, 9, 400), bar("2026-01-08", 9, 10, 7, 8, 500), bar("2026-01-09", 8, 9, 6, 7, 600),
    bar("2026-01-12", 7, 20, 7, 19, 700), bar("2026-02-02", 19, 19, 5, 6, 800),
]


def test_weekly_bars():
    b = qh.build_history(DAILY, [], "1y", "1wk", date(2026, 3, 1))
    assert [r["date"] for r in b["rows"]] == ["2026-02-02", "2026-01-12", "2026-01-05", "2026-01-02"]
    wk = {r["date"]: r for r in b["rows"]}["2026-01-05"]               # Mon-Fri Jan 5-9
    assert (wk["open"], wk["high"], wk["low"], wk["close"], wk["volume"]) == (11, 16, 6, 7, 2000)
    assert {r["date"]: r["volume"] for r in b["rows"]}["2026-01-02"] == 100       # lone Friday is its own week


def test_monthly_bars_and_dividend_adjusted_close():
    divs = [{"ex_date": "2026-01-12", "amount": 0.7}]                   # previous close 7 -> factor 0.9
    b = qh.build_history(DAILY, divs, "1y", "1mo", date(2026, 3, 1))
    jan, feb = b["rows"][1], b["rows"][0]
    assert jan["date"] == "2026-01-02"
    assert (jan["open"], jan["high"], jan["low"], jan["close"], jan["volume"]) == (10, 20, 6, 19, 2800)
    assert jan["adj_close"] == pytest.approx(19.0)                       # last close of Jan is on/after the ex-date
    assert feb["adj_close"] == pytest.approx(6.0)
    wk = qh.build_history(DAILY, divs, "1y", "1wk", date(2026, 3, 1))["rows"]
    assert {r["date"]: r["adj_close"] for r in wk}["2026-01-05"] == pytest.approx(7 * 0.9)
    assert b["dividends"] == [{"date": "2026-01-12", "amount": 0.7}]


def test_clipped_first_bar_is_dated_inside_the_range():
    b = qh.build_history(DAILY, [], "1m", "1wk", date(2026, 2, 5))        # range starts Jan 5, a Monday
    assert b["rows"][-1]["date"] == "2026-01-05"
    b = qh.build_history(DAILY, [], "1m", "1mo", date(2026, 2, 10))       # starts Jan 10: only Jan 12 is left of January
    assert [r["date"] for r in b["rows"]] == ["2026-02-02", "2026-01-12"]
    assert b["rows"][1]["volume"] == 700


def test_etf_is_not_adjusted():
    daily = [bar("2026-01-05", 1, 1, 1, 100.0), bar("2026-01-06", 1, 1, 1, 100.0)]
    b = qh.build_history(daily, [{"ex_date": "2026-01-06", "amount": 5.0}], "1y", "1d", date(2026, 3, 1), adjusted=False)
    assert [r["adj_close"] for r in b["rows"]] == [100.0, 100.0] and b["dividends"] == []


# ── splits already in Nasdaq prices ──

def test_nvda_split_has_no_jump_in_real_data():
    # Nasdaq's own answer for 2024-06-03..06-14 (10-for-1 split, first split-adjusted session 2024-06-10)
    rows = fixture("nvda_split_window")["tradesTable"]["rows"]
    a = {nq.parse_date(r["date"]): nq.num(r["close"]) for r in rows}
    assert 0.9 < a["2024-06-10"] / a["2024-06-07"] < 1.1                 # not 10x


# ── route ──

def test_route(monkeypatch):
    monkeypatch.setattr(nq, "clean_symbol", nq.clean_symbol)
    monkeypatch.setattr(nq, "daily_history", lambda s: DAILY if s == "XYZ" else [])
    monkeypatch.setattr(nq, "dividends", lambda s: [] if s == "TSLA" else [{"ex_date": "2026-01-12", "amount": 0.7, "source": "Tencent"}])
    monkeypatch.setattr(qh, "datetime", type("D", (), {"now": staticmethod(lambda tz=None: __import__("datetime").datetime(2026, 3, 1, tzinfo=tz))}))
    r = qh.history("xyz", "1y", "1d")
    assert r["symbol"] == "XYZ" and r["adjusted"] is True and r["source"] == "Nasdaq" and len(r["rows"]) == 8
    assert r["dividends"] == [{"date": "2026-01-12", "amount": 0.7}] and r["dividend_data"] is True
    monkeypatch.setattr(nq, "daily_history", lambda s: DAILY)
    assert r["dividend_source"] == "Tencent"
    tsla = qh.history("TSLA", "ytd", "1d")                              # pays no dividends: adj close = close
    assert tsla["dividend_data"] is False and tsla["dividends"] == [] and tsla["dividend_source"] is None
    assert all(x["adj_close"] == x["close"] for x in tsla["rows"])
    for bad in [lambda: qh.history("!!", "1y", "1d"), lambda: qh.history("XYZ", "7y", "1d"),
                lambda: qh.history("XYZ", "1y", "1h")]:
        with pytest.raises(HTTPException) as e:
            bad()
        assert e.value.status_code == 400
    monkeypatch.setattr(nq, "daily_history", lambda s: [])
    with pytest.raises(HTTPException) as e:
        qh.history("NOPE", "1y", "1d")
    assert e.value.status_code == 404

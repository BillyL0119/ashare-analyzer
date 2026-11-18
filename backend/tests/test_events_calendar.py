"""routers/events_calendar.py from saved Nasdaq answers (tests/fixtures/nasdaq/cal_*.json). No network."""
import json
import pathlib
from datetime import date

import pytest

from routers import events_calendar as ev
from routers import macro
from services import nasdaq as nq

FIX = pathlib.Path(__file__).parent / "fixtures" / "nasdaq"
DAY = date(2026, 11, 18)       # a Wednesday: the Sunday before it is Nov 15


def fixture(name):
    return json.loads((FIX / f"{name}.json").read_text())["data"]


@pytest.fixture(autouse=True)
def offline(monkeypatch, tmp_path):
    monkeypatch.setattr(nq, "_mem", {})
    monkeypatch.setattr(nq, "_CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(macro, "_cache", {})
    calls = []

    def fake_get(path, params=None, timeout=8):
        calls.append((path, params))
        return {"calendar/earnings": fixture("cal_earnings"), "calendar/dividends": fixture("cal_div"),
                "calendar/splits": fixture("cal_splits"), "ipo/calendar": fixture("cal_ipo")}.get(path)
    monkeypatch.setattr(nq, "get", fake_get)

    def no_network(*a, **kw):
        raise AssertionError("no network in tests")
    monkeypatch.setattr(macro.requests, "get", no_network)

    def no_economic(d):
        macro._cache[d.isoformat()] = (0, [])         # "answered, nothing scheduled"
        return []
    monkeypatch.setattr(macro, "_fetch_day", no_economic)
    return calls


def test_earnings_sorted_by_market_cap_with_plain_timing():
    out = ev.day(DAY.isoformat(), "earnings", "en")
    rows = out["rows"]
    assert out["error"] is False and rows[0]["symbol"] == "PANW"
    caps = [r["market_cap"] for r in rows if r["market_cap"] is not None]
    assert caps == sorted(caps, reverse=True)
    assert rows[-1]["market_cap"] is None                         # blank market caps sort last
    assert {r["timing"] for r in rows} == {"before_open", "after_close", None}
    panw = rows[0]
    assert panw["market_cap"] == 253136273000 and panw["eps_estimate"] == 0.52 and panw["estimates"] == 16
    assert panw["last_year_date"] == "2025-11-19" and panw["fiscal_quarter"] == "Oct/2026"


def test_negative_eps_in_parentheses():
    assert ev._money("($0.23)") == -0.23 and ev._money("-$0.23") == -0.23
    assert ev._money("N/A") is None and ev._money("") is None


def test_dividends_keep_that_ex_date_only():
    rows = ev.day(DAY.isoformat(), "dividends", "en")["rows"]
    assert len(rows) == 36 and all(r["ex_date"] == "2026-11-18" for r in rows)
    solt = next(r for r in rows if r["symbol"] == "SOLT")
    assert solt["amount"] == 0.0655 and solt["annual"] == 0.786 and solt["payment_date"] == "2026-11-19"
    # another day: the fixture's rows all have a different ex-date, so none match
    assert ev.day("2026-11-19", "dividends", "en")["rows"] == []


def test_splits_are_cut_per_effective_date():
    rows = ev.day("2026-11-19", "splits", "en")["rows"]
    assert len(rows) == 19 and all(r["effective_date"] == "2026-11-19" for r in rows)
    assert ev.day("2026-11-21", "splits", "en")["rows"] == []        # a Saturday


def test_ipos_priced_expected_and_filed_for_the_day():
    priced = ev.day("2026-11-13", "ipos", "en")["rows"]
    assert {r["status"] for r in priced} >= {"priced"} and {r["symbol"] for r in priced} >= {"MDRN", "VVVV", "WWB"}
    big = ev.day("2026-11-19", "ipos", "en")["rows"]
    anth = next(r for r in big if r["status"] == "expected")
    assert anth["price"] is None and anth["price_text"] == "70.00-78.00" and anth["deal_size"] == 74002500000
    filed = ev.day("2026-11-16", "ipos", "en")["rows"]
    assert [r["status"] for r in filed] == ["filed"] and filed[0]["symbol"] == "CORE"


def test_week_starts_on_sunday_and_counts_each_type(offline):
    out = ev.week("2026-11-18")                      # any day: the strip snaps back to Sunday
    assert out["start"] == "2026-11-15" and out["end"] == "2026-11-21" and len(out["days"]) == 7
    wed = next(d for d in out["days"] if d["date"] == "2026-11-18")
    assert set(wed["counts"]) == set(ev.TYPES)
    assert wed["counts"]["earnings"] == 62 and wed["counts"]["dividends"] == 36 and wed["counts"]["splits"] == 2
    # the IPO month and the splits list are fetched once for the whole week
    paths = [c[0] for c in offline]
    assert paths.count("ipo/calendar") == 1 and paths.count("calendar/splits") == 1


def test_day_answers_come_from_the_cache(offline):
    ev.day(DAY.isoformat(), "earnings", "en")
    ev.day(DAY.isoformat(), "earnings", "en")
    assert [c[0] for c in offline].count("calendar/earnings") == 1


def test_failed_answer_is_reported_and_not_cached(monkeypatch):
    monkeypatch.setattr(nq, "get", lambda *a, **k: None)
    out = ev.day(DAY.isoformat(), "earnings", "en")
    assert out["error"] is True and out["rows"] == []
    assert ev.week("2026-11-15")["days"][0]["counts"]["earnings"] is None      # unknown, not zero
    assert not any(k.startswith("ev_") for k in nq._mem)


def test_an_empty_but_answered_day_is_cached(monkeypatch, offline):
    monkeypatch.setattr(nq, "get", lambda *a, **k: {"rows": None})              # a Saturday
    assert ev.day("2026-11-21", "earnings", "en") == {"date": "2026-11-21", "type": "earnings", "rows": [],
                                                      "source": "Nasdaq", "error": False}
    assert "ev_earnings_2026-11-21" in nq._mem


def test_bad_input_is_a_400():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as e:
        ev.day("tomorrow", "earnings", "en")
    assert e.value.status_code == 400
    with pytest.raises(HTTPException):
        ev.day(DAY.isoformat(), "bonds", "en")
    with pytest.raises(HTTPException):
        ev.week("11/18/2026")


def test_economic_rows_carry_importance_explanation_and_pairs(monkeypatch):
    def fake_day(d):
        macro._cache[d.isoformat()] = (0, [])
        return [
        {"date": "2026-11-18", "time_utc": "2026-11-18T13:30:00+00:00", "country": "United States", "name": "CPI",
         "actual": "", "consensus": "0.3%", "previous": "0.2%"},
        {"date": "2026-11-18", "time_utc": "2026-11-18T13:30:00+00:00", "country": "United States", "name": "CPI",
         "actual": "", "consensus": "3.1%", "previous": "3.0%"}]
    monkeypatch.setattr(macro, "_fetch_day", fake_day)
    rows, answered = ev._economic(DAY, "en")
    assert answered and {r["period"] for r in rows} == {"mom", "yoy"}
    assert all(r["importance"] == 3 and r["explain"] for r in rows)
    assert ev._economic_count(DAY) == 2

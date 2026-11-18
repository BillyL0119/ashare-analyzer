"""Holders and Analysts endpoints: parsing and units from saved Nasdaq answers. No network."""
import json
import pathlib

import pytest

from routers import quote_holders as qh
from services import nasdaq as nq

FIX = pathlib.Path(__file__).parent / "fixtures" / "nasdaq"


def fx(name):
    return json.loads((FIX / f"{name}.json").read_text())["data"]


@pytest.fixture(autouse=True)
def offline(monkeypatch, tmp_path):
    monkeypatch.setattr(nq, "_mem", {})
    monkeypatch.setattr(nq, "_CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(nq, "asset_class", lambda sym: "stocks")

    answers = {
        "institutional-holdings": fx("institutions"), "insider-trades": fx("insider"),
        "short-interest": fx("short"), "ratings": fx("ratings"), "targetprice": fx("targetprice"),
        "earnings-forecast": fx("forecast"), "peg-ratio": fx("peg"),
    }

    def fake_get(path, params=None, timeout=8):
        for k, v in answers.items():
            if k in path:
                return v
        raise AssertionError(f"unexpected path {path}")
    monkeypatch.setattr(nq, "get", fake_get)
    monkeypatch.setattr(nq, "info", lambda sym: {"primaryData": {"lastSalePrice": "$350.25"}})


def test_ownership_units():
    own, top = qh.parse_ownership(fx("institutions"))
    assert own["institutional_pct"] == 76.83
    assert own["shares_outstanding"] == 14_532e6          # millions -> shares
    assert own["total_value"] == 3_928_860e6              # millions -> dollars
    assert own["institutional_shares"] == 11_164_389_806
    assert own["institutions_count"] == 6519
    assert own["positions"]["increased"] == {"holders": 2684, "shares": 276_822_441}
    assert own["positions"]["sold_out"] == {"holders": 87, "shares": 9_335_923}
    assert len(top) == 10
    assert top[0]["name"] == "Vanguard Group Inc"
    assert top[0]["value"] == 501_923_572 * 1000          # column is in thousands
    assert top[0]["change_pct"] == 1.919 and top[0]["as_of"] == "2025-12-31"


def test_insiders():
    ins = qh.parse_insiders(fx("insider"))
    s = ins["summary"]
    assert (s["buys_3m"], s["sells_3m"], s["sells_12m"]) == (0, 25, 45)
    assert s["shares_sold_3m"] == 694_404
    t = ins["transactions"]
    assert len(t) <= 25
    assert t[0]["type"] == "Automatic Sell" and t[0]["planned"] is True
    assert t[0]["date"] == "2026-11-10" and t[0]["price"] == 351.36
    assert t[0]["value"] == round(2399 * 351.36, 2) and t[0]["direct"] is True
    option = next(x for x in t if x["type"] == "Option Execute")
    assert option["price"] is None and option["value"] is None and option["planned"] is False


def test_short_interest_oldest_first_and_percent():
    si = qh.parse_short_interest(fx("short"), 14_532e6)
    dates = [r["settlement_date"] for r in si["rows"]]
    assert dates == sorted(dates) and len(dates) == 24
    assert si["rows"][-1]["settlement_date"] == "2026-10-30"
    assert si["rows"][-1]["shares_short"] == 144_791_472
    assert si["latest_pct_of_shares"] == round(144_791_472 / 14_532e6 * 100, 2)
    assert qh.parse_short_interest(fx("short"))["latest_pct_of_shares"] is None


def test_analysts_parts():
    tp = fx("targetprice")
    r = qh.parse_rating(fx("ratings"), tp)
    assert r == {"mean": "Hold", "analysts": 29, "buy": 15, "hold": 8, "sell": 6}
    assert qh.parse_targets(tp) == {"low": 261.0, "average": 343.2, "high": 425.0}
    h = qh.parse_history(tp)
    assert h[0]["date"] == "2025-11-01" and h[-1]["date"] == "2026-11-01" and h[-1]["price"] == 343.2
    f = qh.parse_forecasts(fx("forecast"))
    assert f["quarterly"][0] == {"fiscal_end": "2026-12", "consensus": 2.94, "high": 3.18, "low": 2.86,
                                 "estimates": 10, "up": 4, "down": 2}
    assert f["yearly"][0]["fiscal_end"] == "2027-09"
    assert qh.parse_peg(fx("peg")) == {"value": 3.39}


def test_no_coverage_is_null():
    empty = {"symbol": "spy", "consensusOverview": None, "historicalConsensus": []}
    assert qh.parse_rating({"meanRatingType": "", "ratingsSummary": "Consensus information is not available"},
                           empty) is None
    assert qh.parse_targets(empty) is None and qh.parse_history(empty) == []
    assert qh.parse_forecasts({"quarterlyForecast": None, "yearlyForecast": None}) is None
    assert qh.parse_peg({"pegr": {"pegValue": 0.0}}) is None
    assert qh.parse_ownership(None) == (None, [])
    assert qh.parse_insiders(None) is None


def test_endpoints():
    h = qh.holders("aapl")
    assert h["symbol"] == "AAPL" and h["ownership"]["institutional_pct"] == 76.83
    assert h["short_interest"]["latest_pct_of_shares"] == pytest.approx(1.0, abs=0.1)
    a = qh.analysts("brk-b")
    assert a["symbol"] == "BRK.B" and a["targets"]["current"] == 350.25
    assert a["rating"]["buy"] == 15


def test_bad_symbols(monkeypatch):
    with pytest.raises(qh.HTTPException) as e:
        qh.holders("not a symbol!")
    assert e.value.status_code == 400
    monkeypatch.setattr(nq, "asset_class", lambda sym: None)
    with pytest.raises(qh.HTTPException) as e:
        qh.analysts("ZZZZ")
    assert e.value.status_code == 404


def test_etf_has_no_insiders_and_zero_trades_is_an_answer(monkeypatch):
    zeros = {"numberOfTrades": {"rows": [{"insiderTrade": "Number of Sells", "months3": "0", "months12": "0"}]},
             "transactionTable": {"table": {"rows": []}}}
    assert qh.parse_insiders(zeros)["transactions"] == []
    monkeypatch.setattr(nq, "asset_class", lambda sym: "etf")
    assert qh.holders("spy")["insiders"] is None

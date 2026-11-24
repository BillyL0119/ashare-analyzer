"""Investing journal maths: average cost, splits, cash, time-weighted return, SPY with dividends, warnings."""
import pytest

from services import journal as j

TODAY = "2027-06-30"


def e(**kw):
    kw.setdefault("fee", 0)
    kw.setdefault("reason", "test")
    return j.new_entry(kw, TODAY)


def test_validation_messages():
    with pytest.raises(j.JournalError, match="why"):
        j.clean_entry({"type": "buy", "date": "2027-01-04", "ticker": "AAPL", "shares": 1, "price": 10}, TODAY)
    with pytest.raises(j.JournalError, match="future"):
        j.clean_entry({"type": "deposit", "date": "2028-01-01", "amount": 5}, TODAY)
    with pytest.raises(j.JournalError, match="ticker"):
        j.clean_entry({"type": "buy", "date": "2027-01-04", "ticker": "aa pl", "shares": 1, "price": 1, "reason": "x y"}, TODAY)
    ok = j.clean_entry({"type": "buy", "date": "2027-01-04", "ticker": "brk.b", "shares": "0.5", "price": "400",
                        "reason": "cheap", "tag": "weird"}, TODAY)
    assert ok["ticker"] == "BRK.B" and ok["shares"] == 0.5 and ok["tag"] == "other" and ok["fee"] == 0.0


def test_average_cost_realised_gain_and_cash():
    es = [e(type="deposit", date="2027-01-04", amount=1000),
          e(type="buy", date="2027-01-05", ticker="AAA", shares=10, price=10, fee=1),
          e(type="buy", date="2027-02-01", ticker="AAA", shares=10, price=20, fee=1),
          e(type="sell", date="2027-03-01", ticker="AAA", shares=5, price=30, fee=1, reason="took profit")]
    lg = j.ledger(es)
    p = lg["positions"]["AAA"]
    assert p["shares"] == pytest.approx(15)
    assert p["cost"] == pytest.approx(302 * 15 / 20)               # average cost 15.1 a share
    r = lg["realised"][0]
    assert r["gain"] == pytest.approx(5 * 30 - 1 - 5 * 15.1)
    assert r["held_days"] == 55 and r["buy_reasons"][0]["reason"] == "test" and r["sell_reason"] == "took profit"
    assert lg["cash"] == pytest.approx(1000 - 101 - 201 + 149)


def test_cannot_sell_more_than_held_or_spend_missing_cash():
    with pytest.raises(j.JournalError, match="only"):
        j.ledger([e(type="deposit", date="2027-01-04", amount=100), e(type="buy", date="2027-01-05", ticker="A", shares=1, price=10),
                  e(type="sell", date="2027-01-06", ticker="A", shares=2, price=10)])
    with pytest.raises(j.JournalError, match="deposit"):
        j.ledger([e(type="buy", date="2027-01-05", ticker="A", shares=1, price=10)])


def test_split_restates_shares():
    split = lambda sym, day: 4.0 if day < "2027-03-01" else 1.0    # noqa: E731  4-for-1 on 2027-03-01
    es = [e(type="deposit", date="2027-01-04", amount=1000), e(type="buy", date="2027-01-05", ticker="S", shares=2, price=400),
          e(type="sell", date="2027-04-01", ticker="S", shares=4, price=110)]
    lg = j.ledger(es, split)
    assert lg["positions"]["S"]["shares"] == pytest.approx(4)       # 8 today-shares bought, 4 sold
    assert lg["realised"][0]["gain"] == pytest.approx(4 * 110 - 4 * 100)


def test_deposits_do_not_count_as_return_but_dividends_do():
    days = ["2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07"]
    closes = {"A": [{"date": "2027-01-04", "close": 10}, {"date": "2027-01-05", "close": 11},
                    {"date": "2027-01-06", "close": 11}, {"date": "2027-01-07", "close": 11}]}
    es = [e(type="deposit", date="2027-01-04", amount=100), e(type="buy", date="2027-01-04", ticker="A", shares=10, price=10),
          e(type="deposit", date="2027-01-06", amount=1000),          # big top-up: no gain
          e(type="dividend", date="2027-01-07", ticker="A", amount=11)]  # 11 on 1110 of value: +1.0%
    vals = j.daily_values(es, days, closes)
    curve = j.time_weighted(vals)
    assert curve[1] == pytest.approx(1.10)                          # the stock rose 10%
    assert curve[2] == pytest.approx(1.10)                          # the deposit added nothing
    assert curve[3] == pytest.approx(1.10 * (1121 / 1110))     # 1000 cash + 110 of stock, then +11


def test_spy_total_return_and_drawdown():
    rows = [{"date": "2027-01-04", "close": 100}, {"date": "2027-01-05", "close": 99}, {"date": "2027-01-06", "close": 101}]
    divs = [{"ex_date": "2027-01-05", "amount": 1.0}]
    curve = j.total_return_index(rows, divs, ["2027-01-04", "2027-01-05", "2027-01-06"])
    assert curve[1] == pytest.approx(1.0)                           # price fell 1, dividend 1 paid: flat
    assert curve[2] == pytest.approx(101 / 99)
    assert j.max_drawdown([1, 1.2, 0.9, 1.3]) == pytest.approx(0.9 / 1.2 - 1)


def test_warnings():
    holds = [{"ticker": "A", "weight": 35, "sector": "Energy"}, {"ticker": "B", "weight": 10, "sector": "Energy"},
             {"ticker": "VOO", "weight": 30, "sector": "ETF / fund"}]
    w = j.warnings_for(holds, 100, {"Energy": 45, "cash": 55}, -20, 12)
    codes = {x["code"] for x in w}
    assert codes == {"big_position", "big_sector", "drawdown", "many_trades"}
    assert [x["ticker"] for x in w if x["code"] == "big_position"] == ["A"]       # the index fund is not flagged
    assert any(x["code"] == "few_names" for x in j.warnings_for(holds[:2], 100, {}, 0, 0))

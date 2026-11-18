"""Summary tab logic: parsing, ranges, performance, peers, the live payload. No network."""

import json
import pathlib

import pytest
from fastapi import HTTPException

from routers import quote_summary as qs
from services import nasdaq as nq

FIX = pathlib.Path(__file__).parent / "fixtures"


def bars(*pairs):
    return [{"date": d, "close": c, "open": c, "high": c, "low": c, "volume": 1} for d, c in pairs]


def test_stamp_and_status():
    assert qs._stamp("Nov 18, 2026 11:52 AM ET") == ("2026-11-18", "11:52 AM ET", 11 * 60 + 52)
    assert qs._stamp("Nov 17, 2026 4:00 PM ET")[2] == 16 * 60
    assert qs._stamp("Nov 17, 2026") == ("2026-11-17", None, None)
    assert qs._stamp(None) == (None, None, None)
    assert [qs._status(x) for x in ("Open", "Market Closed", "Pre-Market", "After-Hours", None)] == \
        ["open", "closed", "pre", "post", "closed"]


def test_tidy_name_and_pair():
    assert qs._tidy_name("Apple Inc. Common Stock") == "Apple Inc."
    assert qs._tidy_name("Rivian Automotive, Inc. Class A Common Stock") == "Rivian Automotive, Inc."
    assert qs._tidy_name("Coca-Cola Company (The)") == "The Coca-Cola Company"
    assert qs._pair("$356.42/$351.4706") == (356.42, 351.4706)
    assert qs._pair("N/A") == (None, None)


def test_extended_hours():
    info = {"secondaryData": {"lastSalePrice": "$351.20", "netChange": "-0.46", "percentageChange": "-0.13%",
                              "lastTradeTimestamp": "Nov 17, 2026 7:59 PM ET"}}
    e = qs._extended(info, "closed")
    assert e["session"] == "post" and e["price"] == 351.2 and e["change_pct"] == -0.13
    assert qs._extended({"secondaryData": None}, "open") is None
    assert qs._extended({"secondaryData": {"lastSalePrice": "N/A"}}, "post") is None


def test_minute_feed_fixture():
    days = qs.parse_minute_feed(json.loads((FIX / "tencent_dayus_AAPL.json").read_text()))
    assert [d["date"] for d in days][-1] == "2026-11-18" and len(days) == 5
    today = days[-1]
    assert today["prev_close"] == 351.91
    assert today["points"][0] == [1795012200000, 353.84]     # 09:30 ET
    assert qs.parse_minute_feed({"data": {}}) == [] and qs.parse_minute_feed(None) == []


def test_five_minute_downsample_keeps_last_point():
    day = {"date": "2026-11-18", "points": [[t * 60000, 1.0 + t] for t in range(0, 13)]}
    pts = qs._downsample_5m([day])
    assert [p[0] // 60000 for p in pts] == [0, 5, 10, 12]


def test_range_starts_and_base_bar():
    assert qs.range_start("ytd", "2026-11-17") == "2025-12-31"
    assert qs.range_start("1m", "2026-03-31") == "2026-02-28"
    assert qs.range_start("10y", "2026-11-17") == "2016-11-17"
    rows = bars(("2025-12-30", 10), ("2025-12-31", 11), ("2026-01-02", 12))
    assert qs.base_bar(rows, "2025-12-31")["close"] == 11
    assert qs.base_bar(rows, "2025-12-29")["close"] == 10       # history starts within a week: first bar
    assert qs.base_bar(rows, "2025-01-01") is None              # younger than the period: no guess


def test_ranges_use_live_price_and_prior_closes():
    prior = bars(("2025-12-31", 100), ("2026-10-16", 110), ("2026-11-10", 120), ("2026-11-11", 121),
                 ("2026-11-12", 122), ("2026-11-13", 123), ("2026-11-14", 124), ("2026-11-17", 125))
    r = qs.build_ranges("X", 130, 1.5, "2026-11-18", prior, [])
    assert r["1d"] == 1.5
    assert r["ytd"] == 30.0                    # vs the last close of 2025
    assert r["1m"] == nq.pct_change(130, 110)  # last close on or before 2026-10-18
    assert r["5d"] == nq.pct_change(130, 121)  # today + 11-17, 14, 13, 12 are five sessions; the base is the 11-11 close
    assert r["5y"] is None and r["10y"] is None


def test_weekly_keeps_last_bar_of_each_week():
    rows = bars(("2026-11-09", 1), ("2026-11-12", 2), ("2026-11-13", 3), ("2026-11-16", 4))
    assert [r["close"] for r in qs._weekly(rows)] == [3, 4]


def test_performance_rows():
    stock = bars(("2021-11-16", 50), ("2023-11-16", 80), ("2025-11-17", 90), ("2025-12-31", 100), ("2026-11-17", 130))
    bench = bars(("2020-01-02", 1), ("2021-11-16", 400), ("2023-11-16", 500), ("2025-11-17", 600),
                 ("2025-12-31", 650), ("2026-11-17", 700))
    rows, as_of = qs.performance_rows(stock, bench)
    by = {r["key"]: r for r in rows}
    assert as_of == "2026-11-17"
    assert by["ytd"] == {"key": "ytd", "stock": 30.0, "benchmark": 7.69}
    assert by["1y"]["stock"] == pytest.approx(44.44, abs=0.01)
    assert by["5y"]["stock"] == 160.0
    young = qs.performance_rows(bars(("2025-06-01", 10), ("2026-11-17", 20)), bench)[0]
    assert {r["key"]: r["stock"] for r in young}["5y"] is None
    assert {r["key"]: r["benchmark"] for r in young}["5y"] == 75.0
    assert qs.performance_rows([], bench) == ([], None)


def test_pick_peers():
    def row(sym, cap, ind, sec="Tech"):
        return {"symbol": sym, "name": sym, "price": 1, "change_pct": 0, "market_cap": cap, "industry": ind,
                "sector": sec, "pe": None}
    uni = [row("ME", 100, "A"), row("B", 90, "A"), row("C", 400, "A"), row("D", 105, "A"), row("E", 5, "A"),
           row("F", 100, "Z", "Tech"), row("G", 3, "Y", "Fin")]
    basis, group, peers = qs.pick_peers(uni, "ME")
    assert (basis, group) == ("industry", "A")
    assert [p["symbol"] for p in peers] == ["D", "B", "C", "E"]        # nearest market cap first
    uni2 = [row("ME", 100, "A"), row("B", 90, "A"), row("F", 100, "Z"), row("H", 50, "Y")]
    assert qs.pick_peers(uni2, "ME")[0] == "sector"                    # fewer than 3 in the industry
    assert qs.pick_peers(uni, "SPY") == (None, None, [])               # an ETF is not in the universe


def stub_nasdaq(monkeypatch, info, summ, eps=None):
    monkeypatch.setattr(nq, "info", lambda s: info)
    monkeypatch.setattr(nq, "summary", lambda s: summ)
    monkeypatch.setattr(nq, "eps_ttm", lambda s: eps)
    monkeypatch.setattr(nq, "beta_5y_monthly", lambda s: 1.07)
    monkeypatch.setattr(nq, "avg_volume", lambda s, n=63: 42_000_000)
    monkeypatch.setattr(nq, "dividends", lambda s: [])      # forward dividend comes from the summary here
    monkeypatch.setattr(qs, "_tencent_open", lambda s: 351.94)
    monkeypatch.setattr(qs, "_next_earnings", lambda s: None)


def test_live_payload_from_fixtures(monkeypatch):
    info = json.loads((FIX / "nasdaq" / "info.json").read_text())["data"]
    summ = json.loads((FIX / "nasdaq" / "summary.json").read_text())["data"]["summaryData"]
    stub_nasdaq(monkeypatch, info, summ, eps=8.98)
    d = qs.build_live("AAPL")
    assert d["name"] == "Apple Inc." and d["price"] == 351.65 and d["change"] == -0.26 and d["change_pct"] == -0.07
    assert d["prev_close"] == 351.91 and d["day_high"] == 356.42 and d["week52_low"] == 243.42
    assert d["market_cap"] == 5112857593060 and d["dividend_rate"] == 1.08 and d["dividend_yield"] == 0.31
    assert d["ex_dividend_date"] == "2026-11-12" and d["target_1y"] == 360.0
    assert d["pe_ttm"] == nq.pe_ttm(351.65, 8.98) and d["market_status"] == "open"
    assert d["volume"] == 12640411 and d["trade_time"] == "11:52 AM ET" and d["extended"] is None


def test_live_hides_class_share_pe(monkeypatch):
    info = json.loads((FIX / "nasdaq" / "info.json").read_text())["data"]
    summ = json.loads((FIX / "nasdaq" / "summary.json").read_text())["data"]["summaryData"]
    stub_nasdaq(monkeypatch, info, summ, eps=53762.0)       # a Class A EPS against a Class B price
    d = qs.build_live("BRK.B")
    assert d["eps_ttm"] is None and d["pe_ttm"] is None


def test_live_etf_has_no_earnings(monkeypatch):
    info = {"companyName": "SPDR ETF", "exchange": "PSE", "assetClass": "ETF", "marketStatus": "Closed",
            "primaryData": {"lastSalePrice": "$732.33", "netChange": "-0.10", "percentageChange": "-0.01%",
                            "lastTradeTimestamp": "Nov 17, 2026 4:00 PM ET"}, "secondaryData": None}
    stub_nasdaq(monkeypatch, info, {"PreviousClose": {"value": "$732.44"}}, eps=3.0)
    d = qs.build_live("SPY")
    assert d["asset_class"] == "etf" and d["eps_ttm"] is None and d["pe_ttm"] is None
    assert d["market_status"] == "closed" and d["dividend_rate"] is None and d["bid"] is None


def test_unknown_symbol(monkeypatch):
    monkeypatch.setattr(nq, "asset_class", lambda s: None)
    with pytest.raises(HTTPException) as e:
        qs._symbol("ZZZZ")
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e:
        qs._symbol("@@")
    assert e.value.status_code == 400


def test_suffix_order_prefers_learned_then_exchange(monkeypatch):
    monkeypatch.setattr(qs, "_suffix_map", lambda: {"KO": ".N"})
    assert qs._suffix_order("KO", "NYSE") == [".N"]
    assert qs._suffix_order("AAPL", "NASDAQ-GS")[0] == ".OQ"
    assert qs._suffix_order("BRK.B", "NYSE")[0] == ".N"
    assert qs._suffix_order("SPY", "PSE")[0] == ".AM"

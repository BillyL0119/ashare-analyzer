"""routers/quote_stats.py: the Statistics figures computed from saved Nasdaq answers (tests/fixtures/nasdaq,
an AAPL snapshot of 2026-11-17). No network."""
import json
import pathlib
from datetime import date

import pytest

from routers import quote_stats as qs
from services import nasdaq as nq

FIX = pathlib.Path(__file__).parent / "fixtures" / "nasdaq"


def fixture(name):
    return json.loads((FIX / f"{name}.json").read_text())["data"]


@pytest.fixture(autouse=True)
def offline(monkeypatch, tmp_path):
    monkeypatch.setattr(nq, "_mem", {})
    monkeypatch.setattr(nq, "_CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(nq, "asset_class", lambda sym: "stocks")

    def no_network(*a, **kw):
        raise AssertionError("no network in tests")
    monkeypatch.setattr(nq.requests, "get", no_network)


def fake_get(path, params=None, timeout=8):
    table = [("financials", None), ("earnings-forecast", "forecast"), ("peg-ratio", "peg"),
             ("short-interest", "short"), ("institutional-holdings", "institutions"),
             ("company/AAPL/revenue", "revenue")]
    if "financials" in path:
        return fixture("financials_q" if (params or {}).get("frequency") == 2 else "financials_a")
    for part, name in table[1:]:
        if part in path:
            return fixture(name)
    return None


@pytest.fixture
def ctx(monkeypatch):
    monkeypatch.setattr(nq, "get", fake_get)
    monkeypatch.setattr(nq, "daily_history", lambda sym: HIST[sym])
    monkeypatch.setattr(nq, "dividends", lambda sym: DIVS)
    monkeypatch.setattr(nq, "beta_5y_monthly", lambda sym: 1.07)
    return qs._gather("AAPL", "stocks")


def bars(start_price, n, end="2026-11-17"):
    """n daily bars ending on `end`, closes rising one cent a day; weekdays do not matter here."""
    last = date.fromisoformat(end)
    out = []
    for i in range(n):
        d = date.fromordinal(last.toordinal() - (n - 1 - i))
        out.append({"date": d.isoformat(), "open": 0, "high": 0, "low": 0,
                    "close": round(start_price + i * 0.01, 2), "volume": 1000.0})
    return out


HIST = {"AAPL": bars(100, 400), "SPY": bars(50, 400)}
DIVS = [{"ex_date": "2026-02-09", "amount": 0.27, "pay_date": "2026-02-12", "type": "Cash"},
        {"ex_date": "2026-05-11", "amount": 0.27, "pay_date": "2026-05-14", "type": "Cash"},
        {"ex_date": "2026-08-10", "amount": 0.27, "pay_date": "2026-08-13", "type": "Cash"},
        {"ex_date": "2026-11-12", "amount": 0.27, "pay_date": "2026-11-16", "type": "Cash"},
        {"ex_date": "2025-11-10", "amount": 0.26, "pay_date": "2025-11-13", "type": "Cash"}]
TODAY = date(2026, 11, 18)


def rows(ctx, price=351.91):
    payload = qs.build_payload("AAPL", ctx, price, fixture("summary")["summaryData"], today=TODAY)
    return payload, {r["key"]: r for g in payload["groups"] for r in g["rows"]}


def test_statements_are_converted_to_dollars(ctx):
    q = ctx["quarterly"]
    assert q["periods"][0] == "2026-09-26"
    assert q["inc"]["Total Revenue"][0] == 114_477_000_000        # Nasdaq prints thousands
    assert q["ratios"]["Quick Ratio"][0] == pytest.approx(93.76218)   # ratios are not scaled


def test_payload_shape_and_order(ctx):
    payload, by = rows(ctx)
    assert [g["key"] for g in payload["groups"]] == [k for k, _ in qs.GROUPS]
    assert [r["key"] for g in payload["groups"] for r in g["rows"]] == [k for _, ks in qs.GROUPS for k in ks]
    assert payload["fiscal"] == {"fy_end_month": 9, "mrq": "2026-09-26"}
    assert payload["source"] == "Nasdaq" and payload["currency"] == "USD"
    assert all(r["fmt"] and "period" in r for r in by.values())


def test_ttm_sums_four_quarters(ctx):
    _, by = rows(ctx)
    q = ctx["quarterly"]["inc"]
    assert by["revenue_ttm"]["value"] == sum(q["Total Revenue"])
    assert by["net_income_ttm"]["value"] == sum(q["Net Income"])
    ebitda = sum(q["Earnings Before Interest and Tax"]) + sum(ctx["quarterly"]["cf"]["Depreciation"])
    assert by["ebitda_ttm"]["value"] == ebitda
    cf = ctx["quarterly"]["cf"]
    assert by["free_cash_flow_ttm"]["value"] == sum(cf["Net Cash Flow-Operating"]) + sum(cf["Capital Expenditures"])
    assert by["capex_ttm"]["value"] < 0


def test_balance_sheet_figures_match_nasdaqs_own_ratios(ctx):
    _, by = rows(ctx)
    q = ctx["quarterly"]
    # Nasdaq's financialRatiosTable prints the current ratio as 102.31998 %
    assert by["current_ratio_mrq"]["value"] == pytest.approx(q["ratios"]["Current Ratio"][0] / 100, abs=0.005)
    assert by["quick_ratio_mrq"]["value"] == pytest.approx(0.94, abs=0.005)
    assert by["total_cash_mrq"]["value"] == 36_305_000_000 + 20_417_000_000
    assert by["total_debt_mrq"]["value"] == 11_903_000_000 + 68_208_000_000
    assert by["debt_equity_mrq"]["value"] == pytest.approx(80_111 / 112_093 * 100, abs=0.01)
    assert by["debt_equity_mrq"]["fmt"] == "pct"


def test_valuation(ctx):
    _, by = rows(ctx)
    mc = 5_112_857_593_060
    assert by["market_cap"]["value"] == mc
    assert by["pe_ttm"]["value"] == nq.pe_ttm(351.91, ctx["eps_ttm"])
    assert by["pe_forward"]["value"] == round(351.91 / 9.45, 2)     # first fiscal year after FY ending 2026-09-26
    assert by["peg_forward"]["value"] == 3.39
    rev = by["revenue_ttm"]["value"]
    assert by["price_sales_ttm"]["value"] == pytest.approx(mc / rev, abs=0.01)
    assert by["price_book_mrq"]["value"] == pytest.approx(mc / 112_093_000_000, abs=0.01)
    ev = mc + 80_111_000_000 - 56_722_000_000
    assert by["enterprise_value"]["value"] == ev
    assert by["ev_revenue_ttm"]["value"] == pytest.approx(ev / rev, abs=0.01)
    assert by["ev_ebitda_ttm"]["value"] == pytest.approx(ev / by["ebitda_ttm"]["value"], abs=0.01)


def test_margins_and_returns_are_percent_numbers(ctx):
    _, by = rows(ctx)
    rev = by["revenue_ttm"]["value"]
    assert by["gross_margin_ttm"]["value"] == pytest.approx(by["gross_profit_ttm"]["value"] / rev * 100, abs=0.01)
    assert 20 < by["profit_margin_ttm"]["value"] < 35
    assert by["roe_ttm"]["value"] == pytest.approx(by["net_income_ttm"]["value"] / 112_093_000_000 * 100, abs=0.01)
    assert by["roa_ttm"]["value"] == pytest.approx(by["net_income_ttm"]["value"] / 404_548_000_000 * 100, abs=0.01)


def test_share_statistics_and_short_interest(ctx):
    _, by = rows(ctx)
    assert by["shares_outstanding"]["value"] == 14_532_000_000
    assert by["institutional_pct"]["value"] == 76.83
    assert by["shares_short"]["value"] == 144_791_472 and by["shares_short"]["as_of"] == "2026-10-30"
    assert by["shares_short_prior"]["value"] == 131_591_865 and by["shares_short_prior"]["as_of"] == "2026-10-15"
    assert by["short_ratio"]["value"] == 3.36
    assert by["short_pct_shares_out"]["value"] == round(144_791_472 / 14_532_000_000 * 100, 2)
    assert by["avg_volume_3m"]["value"] == 1000 and by["avg_volume_10d"]["value"] == 1000


def test_dividends(ctx):
    _, by = rows(ctx)
    assert by["forward_dividend_rate"]["value"] == 1.08 and by["forward_dividend_yield"]["value"] == 0.31
    assert by["trailing_dividend_rate"]["value"] == 1.08           # four 0.27 payments in the last 365 days; 2025-11-10 is older
    assert by["trailing_dividend_yield"]["value"] == round(1.08 / 351.91 * 100, 2)
    assert by["payout_ratio"]["value"] == round(1.08 / ctx["eps_ttm"] * 100, 2)
    assert by["dividend_date"]["value"] == "2026-11-16" and by["ex_dividend_date"]["value"] == "2026-11-12"


def test_price_history(ctx):
    _, by = rows(ctx)
    assert by["week52_high"]["value"] == 360.83 and by["week52_low"]["value"] == 243.42
    h = HIST["AAPL"]
    assert by["ma_50"]["value"] == round(sum(r["close"] for r in h[-50:]) / 50, 2)
    assert by["ma_200"]["value"] == round(sum(r["close"] for r in h[-200:]) / 200, 2)
    year_ago = [r for r in h if r["date"] <= "2025-11-17"][-1]["close"]
    assert by["change_52w"]["value"] == nq.pct_change(h[-1]["close"], year_ago)
    assert by["beta_5y_monthly"]["value"] == 1.07


def test_eps_pe_beta_are_the_shared_figures(ctx):
    payload, by = rows(ctx)
    assert payload["summary"] == {"beta_5y_monthly": 1.07, "eps_ttm": ctx["eps_ttm"], "pe_ttm": by["pe_ttm"]["value"]}
    assert by["eps_ttm"]["value"] == ctx["eps_ttm"]
    assert by["pe_ttm"]["value"] == nq.pe_ttm(351.91, ctx["eps_ttm"])


def test_pe_moves_with_the_live_price(ctx):
    _, a = rows(ctx, 351.91)
    _, b = rows(ctx, 400.0)
    assert b["pe_ttm"]["value"] > a["pe_ttm"]["value"]
    assert b["market_cap"]["value"] == a["market_cap"]["value"]     # market cap is Nasdaq's own figure


def test_year_over_year_growth_needs_a_quarter_a_year_back(ctx):
    items = [{"period_end": "2025-09-27", "revenue": 100.0, "eps": 1.0},
             {"period_end": "2026-06-27", "revenue": 150.0, "eps": 2.0},
             {"period_end": "2026-09-26", "revenue": 110.0, "eps": 1.1}]
    assert qs._yoy(items, "revenue") == (110.0, 100.0)
    assert qs._yoy(items[1:], "revenue") == (None, None)            # no quarter 350-380 days earlier


def test_loss_maker_and_negative_equity_give_no_ratios(ctx):
    ctx = dict(ctx)
    ctx["eps_ttm"] = -1.5
    q = json.loads(json.dumps(ctx["quarterly"]))
    q["bal"]["Total Equity"][0] = -5_000_000_000.0
    ctx["quarterly"] = q
    _, by = rows(ctx)
    assert by["pe_ttm"]["value"] is None and by["payout_ratio"]["value"] is None
    assert by["price_book_mrq"]["value"] is None and by["roe_ttm"]["value"] is None
    assert by["debt_equity_mrq"]["value"] is None


def test_a_missing_quarter_blanks_the_ttm_rows(ctx):
    ctx = dict(ctx)
    q = json.loads(json.dumps(ctx["quarterly"]))
    q["periods"][1] = "2026-03-01"          # not a quarter gap any more
    q["periods"][3] = "2025-03-01"
    ctx["quarterly"] = q
    _, by = rows(ctx)
    assert by["revenue_ttm"]["value"] is None and by["ebitda_ttm"]["value"] is None
    assert by["current_ratio_mrq"]["value"] is not None            # balance-sheet rows only need the latest quarter


def test_etf_without_statements_is_all_dashes_but_valid(monkeypatch):
    monkeypatch.setattr(nq, "get", lambda *a, **kw: None)
    monkeypatch.setattr(nq, "daily_history", lambda sym: HIST["AAPL"])
    monkeypatch.setattr(nq, "dividends", lambda sym: [])
    monkeypatch.setattr(nq, "quarterly_results", lambda sym: [])
    ctx = qs._gather("SPY", "etf")
    payload = qs.build_payload("SPY", ctx, 600.0, {}, today=TODAY)
    by = {r["key"]: r for g in payload["groups"] for r in g["rows"]}
    assert by["revenue_ttm"]["value"] is None and by["pe_forward"]["value"] is None
    assert payload["fiscal"] == {"fy_end_month": None, "mrq": None}
    assert by["ma_50"]["value"] is not None


def test_symbol_validation(monkeypatch):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as e:
        qs.stats("not a symbol!")
    assert e.value.status_code == 400
    monkeypatch.setattr(nq, "asset_class", lambda sym: None)
    with pytest.raises(HTTPException) as e:
        qs.stats("ZZZZZ")
    assert e.value.status_code == 404

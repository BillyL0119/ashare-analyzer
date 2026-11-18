"""services/nasdaq.py: parsers and the shared figures (EPS, P/E, beta, average volume) from saved Nasdaq
answers in tests/fixtures/nasdaq. No network."""
import json
import pathlib

import pytest

from services import nasdaq as nq

FIX = pathlib.Path(__file__).parent / "fixtures" / "nasdaq"


def fixture(name):
    return json.loads((FIX / f"{name}.json").read_text())["data"]


@pytest.fixture(autouse=True)
def offline(monkeypatch, tmp_path):
    """Every test starts with an empty cache, writes no files into backend/data and makes no requests."""
    monkeypatch.setattr(nq, "_mem", {})
    monkeypatch.setattr(nq, "_CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(nq, "asset_class", lambda sym: "stocks")

    def no_network(*a, **kw):
        raise AssertionError("no network in tests")
    monkeypatch.setattr(nq.requests, "get", no_network)


@pytest.mark.parametrize("raw, want", [
    ("$1,234.5", 1234.5), ("-$5", -5.0), ("12.5%", 12.5), ("$143,756(m)", 143756.0), ("--", None),
    ("N/A", None), ("", None), (None, None), (3, 3.0), ("12,640,411.183510", 12640411.18351), (True, None),
])
def test_num(raw, want):
    assert nq.num(raw) == want


@pytest.mark.parametrize("raw, want", [
    ("11/17/2026", "2026-11-17"), ("Nov 12, 2026", "2026-11-12"), ("2026-11-12", "2026-11-12"),
    ("$2.84 (12/27/2025)", "2025-12-27"), ("N/A", None), (None, None),
])
def test_parse_date(raw, want):
    assert nq.parse_date(raw) == want


def test_val_reads_summary_fields():
    s = fixture("summary")["summaryData"]
    assert nq.val(s, "PreviousClose") == "$351.91"
    assert nq.val(s, "Missing") is None


def test_quarterly_results_and_eps_ttm(monkeypatch):
    monkeypatch.setattr(nq, "get", lambda path, params=None, timeout=8: fixture("revenue"))
    q = nq.quarterly_results("AAPL")
    assert [x["period_end"] for x in q] == sorted(x["period_end"] for x in q)
    last = q[-1]
    assert last["period_end"] == "2026-09-26" and last["eps"] == 2.1 and last["revenue"] == 114477e6
    assert nq.eps_ttm("AAPL") == pytest.approx(2.84 + 2.01 + 2.03 + 2.10)


def test_eps_ttm_refuses_a_gap(monkeypatch):
    rows = [{"period_end": d, "eps": 1.0, "revenue": 1.0} for d in ("2025-03-29", "2025-06-28", "2025-12-27", "2026-03-28")]
    monkeypatch.setattr(nq, "quarterly_results", lambda sym: rows)
    assert nq.eps_ttm("X") is None          # September is missing: not four consecutive quarters


def test_pe_ttm():
    assert nq.pe_ttm(352.0, 8.98) == 39.2
    assert nq.pe_ttm(352.0, -1.2) is None and nq.pe_ttm(352.0, None) is None


def _bars(closes, start="2021-01"):
    """One bar on the 15th and one on the 28th of each month, so month ends are the second close."""
    y, m = map(int, start.split("-"))
    out = []
    for c in closes:
        out.append({"date": f"{y:04d}-{m:02d}-15", "close": c * 0.99, "volume": 100.0})
        out.append({"date": f"{y:04d}-{m:02d}-28", "close": c, "volume": 300.0})
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def test_beta_of_a_doubled_market_is_two(monkeypatch):
    import random
    random.seed(1)
    mkt, stk = [100.0], [100.0]
    for _ in range(61):
        r = random.uniform(-0.05, 0.05)
        mkt.append(mkt[-1] * (1 + r))
        stk.append(stk[-1] * (1 + 2 * r))
    hist = {"SPY": _bars(mkt), "X": _bars(stk)}
    monkeypatch.setattr(nq, "daily_history", lambda sym: hist[sym])
    assert nq.beta_5y_monthly("X") == pytest.approx(2.0, abs=0.01)


def test_beta_needs_three_years(monkeypatch):
    hist = {"SPY": _bars([100 + i for i in range(20)]), "X": _bars([50 + i for i in range(20)])}
    monkeypatch.setattr(nq, "daily_history", lambda sym: hist[sym])
    assert nq.beta_5y_monthly("X") is None


def test_avg_volume_and_close_lookup(monkeypatch):
    rows = _bars([10, 11, 12])
    monkeypatch.setattr(nq, "daily_history", lambda sym: rows)
    assert nq.avg_volume("X", 2) == 200
    assert nq.close_on_or_before(rows, "2021-02-20")["date"] == "2021-02-15"
    assert nq.close_on_or_before(rows, "2020-12-31") is None
    assert nq.pct_change(110, 100) == 10.0 and nq.pct_change(None, 100) is None


def test_daily_history_parses_and_sorts(monkeypatch):
    monkeypatch.setattr(nq, "get", lambda path, params=None, timeout=8: fixture("historical"))
    rows = nq.daily_history("AAPL")
    assert rows[0]["date"] < rows[-1]["date"]
    assert rows[-1] == {"date": "2026-11-17", "open": 352.83, "high": 355.36, "low": 349.67, "close": 351.91, "volume": 37407540.0}


def test_dividends_parse(monkeypatch):
    monkeypatch.setattr(nq, "get", lambda path, params=None, timeout=8: fixture("dividends"))
    d = nq.dividends("AAPL")
    assert d[-1]["ex_date"] == "2026-11-12" and d[-1]["amount"] == 0.27
    assert all(a["ex_date"] <= b["ex_date"] for a, b in zip(d, d[1:]))


def test_empty_answers_are_not_cached(monkeypatch):
    calls = []
    monkeypatch.setattr(nq, "get", lambda *a, **kw: calls.append(1) or None)
    assert nq.daily_history("AAPL") == [] and nq.daily_history("AAPL") == []
    assert len(calls) == 2

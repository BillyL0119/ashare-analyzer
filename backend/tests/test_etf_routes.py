"""ETFs in the A-share routes: /api/similar answers a fund code at once (it used to scan for ~27 s and then
422), and /api/stock/backtest takes fund prices from the fund feed (the stock feed has none: a 500).
No network."""
import time

import pytest

import stubs
stubs.stub()

import importlib  # noqa: E402
import sys  # noqa: E402
import types  # noqa: E402

try:
    importlib.import_module("services.stock_service")      # the real one where its dependencies are installed
except ImportError:                  # CI installs only pytest and numpy: py_mini_racer and akshare's internals are missing
    fake = types.ModuleType("services.stock_service")
    fake.sina_a_daily = fake.sina_index_daily = fake.get_stock_history = lambda *a, **kw: None
    fake._is_fund = lambda code: code.lstrip("shszbj").startswith(("5", "1"))
    sys.modules["services.stock_service"] = fake

from routers import similar, backtest  # noqa: E402


@pytest.mark.parametrize("fn", ["similar_stocks", "similar_cross"])
@pytest.mark.parametrize("code", ["510300", "159915", "588000", "161725"])
def test_similar_refuses_a_fund_at_once(monkeypatch, fn, code):
    def no_scan(*a, **kw):
        raise AssertionError("must not fetch any history for a fund")
    monkeypatch.setattr(similar, "_get_closes_cached", no_scan)
    monkeypatch.setattr(similar, "_find_industry", no_scan)
    t0 = time.time()
    with pytest.raises(similar.HTTPException) as e:
        getattr(similar, fn)(code)
    assert time.time() - t0 < 1
    assert e.value.status_code == 422 and "ETF" in e.value.detail


@pytest.mark.parametrize("fn", ["similar_stocks", "similar_cross"])
def test_similar_still_checks_other_codes_the_old_way(monkeypatch, fn):
    monkeypatch.setattr(similar, "_get_closes_cached", lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("scan started")))
    with pytest.raises(similar.HTTPException) as e:
        getattr(similar, fn)("AAPL")
    assert e.value.status_code == 400


class Frame:
    """The columns the backtest reads from get_stock_history's frame."""
    def __init__(self, dates, closes):
        self.dates, self.closes = dates, closes
        self.empty = not dates

    def dropna(self, subset=None):
        return self

    def tail(self, n):
        return Frame(self.dates[-n:], self.closes[-n:])

    def __getitem__(self, col):
        return types.SimpleNamespace(tolist=lambda: self.dates if col == "date" else self.closes)


def _fund_world(monkeypatch, n=300):
    import math
    dates = [f"2025-{1 + i // 28:02d}-{1 + i % 28:02d}" for i in range(n)]
    closes = [4.0 + math.sin(i / 9.0) * 0.4 + i * 0.001 for i in range(n)]
    asked = []
    monkeypatch.setattr(backtest, "get_stock_history", lambda *a, **kw: (asked.append(a), Frame(dates, closes))[1])
    monkeypatch.setattr(backtest, "sina_a_daily", lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("stock feed has no funds")))
    monkeypatch.setattr(backtest, "_benchmark_closes", lambda is_cn, limit: closes[-limit:])
    monkeypatch.setattr(backtest, "_cache", {})
    return asked


@pytest.mark.parametrize("strategy", ["ma", "rsi", "macd", "boll"])
def test_backtest_of_a_fund_uses_the_fund_feed(monkeypatch, strategy):
    asked = _fund_world(monkeypatch)
    res = backtest.backtest("510300", strategy, "1y")
    assert asked and asked[0][0] == "510300" and asked[0][1] == "daily" and asked[0][4] == ""     # unadjusted
    assert res["symbol"] == "510300" and res["is_cn"] is True
    assert len(res["dates"]) == len(res["equity"]) == 252
    assert res["benchmark_name"] == "沪深300"


def test_a_fund_pays_no_stamp_duty_on_selling():
    dates = ["d1", "d2", "d3", "d4", "d5"]
    closes = [10.0, 10.0, 10.0, 10.0, 10.0]
    signals = [1, 0, -1, 0, 0]
    stock = backtest._run(dates, closes, signals, True)
    fund = backtest._run(dates, closes, signals, True, fund=True)
    assert stock["trades"][0]["pnl"] < fund["trades"][0]["pnl"]
    assert stock["equity"][-1] < fund["equity"][-1]


def test_backtest_of_a_fund_without_history_is_a_clear_404(monkeypatch):
    monkeypatch.setattr(backtest, "get_stock_history", lambda *a, **kw: None)
    monkeypatch.setattr(backtest, "_benchmark_closes", lambda is_cn, limit: [])
    monkeypatch.setattr(backtest, "_cache", {})
    with pytest.raises(backtest.HTTPException) as e:
        backtest.backtest("510300", "ma", "1y")
    assert e.value.status_code == 404

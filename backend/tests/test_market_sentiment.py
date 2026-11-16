"""Market sentiment (routers/market.py): never a made-up number. A real result needs at least one US and one
CN component; a side that failed this time is carried over from the last real result, and with none
there nothing is published (the endpoint answers 503). One stuck source cannot hold up the rest.
Fetchers are stubbed: no network, and no pandas needed."""
import asyncio
import threading
import time
import types

import pytest

import stubs
stubs.stub()
import requests  # noqa: E402

from routers import market  # noqa: E402


class FakeFrame:
    """Just enough of a DataFrame for the Shanghai fallback: rename().tail() and len()."""
    def __init__(self, n=60):
        self.n = n

    def rename(self, **kw):
        return self

    def tail(self, n):
        return self

    def __len__(self):
        return self.n


class Tasks:
    def __init__(self):
        self.added = []

    def add_task(self, fn, *a):
        self.added.append(fn)


@pytest.fixture
def world(monkeypatch):
    """Every source answers; tests then break the ones they care about. Returns the knobs."""
    w = types.SimpleNamespace(us_ok=True, vix_ok=True, cn_ok=True, release=threading.Event(), stuck=False)

    def us_index(sym, days=252):
        if not w.us_ok:
            raise RuntimeError("sina down")
        return {"close": 5000.0, "change_pct": 0.4, "hist": list(range(30))}

    def global_index(name):
        if w.stuck:
            w.release.wait(60)              # a feed that never answers
        return {"close": 100.0, "change_pct": 0.1}

    def vix():
        if not w.vix_ok:
            raise RuntimeError("cboe down")
        return {"close": 15.0}

    def sh_daily(code):
        if not w.cn_ok:
            raise RuntimeError("sina down")
        return FakeFrame()

    monkeypatch.setattr(market, "_ak_us_index", us_index)
    monkeypatch.setattr(market, "_ak_global_index", global_index)
    monkeypatch.setattr(market, "_tencent_hsi", lambda: {"close": 20000.0, "change_pct": 0.2})
    monkeypatch.setattr(market, "_cboe_vix", vix)
    monkeypatch.setattr(market, "_get_spot_df", lambda: None)            # breadth: snapshot not ready
    monkeypatch.setattr(market, "_fetch_indices_tencent", lambda: {})
    monkeypatch.setattr(market, "_calc_rsi", lambda h: 60.0)
    monkeypatch.setattr(market, "_dist_score", lambda h: 80.0)
    monkeypatch.setattr(market, "ak", types.SimpleNamespace(
        stock_zh_index_daily=sh_daily,
        stock_zh_index_spot_sina=lambda: (_ for _ in ()).throw(RuntimeError("sina down"))))
    monkeypatch.setattr(market, "_SOURCES_WAIT", 0.4)
    monkeypatch.setattr(market, "_sentiment_data", None)
    monkeypatch.setattr(market, "_sentiment_ts", 0)
    monkeypatch.setattr(market, "_sentiment_fetching", False)
    monkeypatch.setattr(market, "_sentiment_fetch_started", 0)
    yield w
    w.release.set()


def endpoint():
    tasks = Tasks()
    return asyncio.run(market.market_sentiment(tasks)), tasks


def test_a_source_that_never_answers_does_not_block_the_result(world):
    world.stuck = True
    t0 = time.time()
    res = market._do_fetch_sentiment()
    assert time.time() - t0 < 5
    assert res["us_sentiment"]["score"] is not None and res["cn_sentiment"]["score"] is not None
    assert res["us_sentiment"]["vix"] == 15.0
    # the stuck ones are left out (no number), the finished ones kept
    by_sym = {i["symbol"]: i for i in res["indices"]}
    assert by_sym["^FTSE"]["close"] is None and by_sym["^N225"]["change_pct"] is None
    assert by_sym["^HSI"]["close"] == 20000.0


def test_run_bounded_returns_what_finished():
    release = threading.Event()
    try:
        got = market._run_bounded({"fast": lambda: 1, "boom": lambda: 1 / 0, "stuck": lambda: release.wait(60)}, 0.3)
    finally:
        release.set()
    assert got == {"fast": 1}


def test_no_cn_data_and_no_history_publishes_nothing_and_the_endpoint_says_503(world):
    world.cn_ok = False
    assert market._do_fetch_sentiment() is None
    assert market._sentiment_data is None
    with pytest.raises(market.HTTPException) as e:
        endpoint()
    assert e.value.status_code == 503 and e.value.detail == "warming up"


def test_no_us_data_and_no_history_publishes_nothing(world):
    world.us_ok = world.vix_ok = False
    assert market._do_fetch_sentiment() is None
    assert market._sentiment_data is None


def test_a_missing_side_is_carried_over_from_the_last_real_result(world):
    first = market._do_fetch_sentiment()
    assert first is not None
    cn_before = first["cn_sentiment"]
    world.cn_ok = False
    time.sleep(0.01)
    second = market._do_fetch_sentiment()
    assert second["cn_sentiment"] == cn_before                      # carried, with its own updated_at
    assert second["us_sentiment"]["updated_at"] > cn_before["updated_at"]     # the US side is new
    assert market._sentiment_data is second
    data, _ = endpoint()
    assert data["cn_sentiment"]["score"] == cn_before["score"]


def test_endpoint_returns_real_data_with_its_age(world):
    market._do_fetch_sentiment()
    market._sentiment_ts -= 42
    data, tasks = endpoint()
    assert 41 <= data["age_seconds"] <= 44
    assert data["us_sentiment"]["score"] is not None
    assert tasks.added == []                                         # fresh enough: no refresh asked


def test_old_data_is_served_and_a_refresh_is_asked_for(world):
    market._do_fetch_sentiment()
    market._sentiment_ts -= market._SENTIMENT_TTL + 5
    data, tasks = endpoint()
    assert data["age_seconds"] > market._SENTIMENT_TTL
    assert tasks.added == [market._do_fetch_sentiment]


def test_watchdog_lets_a_new_fetch_past_one_that_is_stuck(world, monkeypatch):
    assert market._begin_fetch() is True
    assert market._begin_fetch() is False                           # a fetch is running
    monkeypatch.setattr(market, "_sentiment_fetch_started", time.time() - market._FETCH_WATCHDOG - 1)
    assert market._begin_fetch() is True                            # presumed stuck


def test_nan_is_not_published(world, monkeypatch):
    monkeypatch.setattr(market, "_calc_rsi", lambda h: float("nan"))
    res = market._do_fetch_sentiment()
    assert res["us_sentiment"]["components"][0]["score"] is None


def _report(monkeypatch):
    monkeypatch.setattr(market, "_ak_us_index", lambda sym, days=5: {"close": 5000.0, "change_pct": 0.5})

    def no_net(*a, **kw):
        raise RuntimeError("no network in tests")
    monkeypatch.setattr(requests, "get", no_net)
    return market._generate_daily_report("2026-11-16")


def test_daily_report_leaves_the_mood_out_without_sentiment(world, monkeypatch):
    rep = _report(monkeypatch)
    assert "sentiment" not in rep
    assert "情绪" not in rep["summary_zh"] and "mood" not in rep["summary_en"]
    assert "50" not in rep["summary_zh"]


def test_daily_report_uses_the_real_sentiment(world, monkeypatch):
    market._do_fetch_sentiment()
    rep = _report(monkeypatch)
    assert rep["sentiment"]["us_score"] == market._sentiment_data["us_sentiment"]["score"]
    assert "美股情绪" in rep["summary_zh"] and "Market mood today" in rep["summary_en"]


def test_a_report_without_sentiment_is_not_saved_for_the_day(world, monkeypatch, tmp_path):
    monkeypatch.setattr(market, "_REPORT_PATH", str(tmp_path / "r.json"))
    monkeypatch.setattr(market, "_partial_report", None)
    monkeypatch.setattr(market, "_generate_daily_report", lambda today: {
        "date": today, "cn_indices": {"sh": {}}, "us_indices": {"sp500": {}}})
    market._build_report("2026-11-16")
    assert not (tmp_path / "r.json").exists() and market._partial_report is not None

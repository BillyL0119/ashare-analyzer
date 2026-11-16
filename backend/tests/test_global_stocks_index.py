"""routers/global_stocks.py: Japan's index tile comes from its own short-lived Sina fetch, not from the
sentiment cache; a slow or failing fetch costs the request at most the time limit. No network."""
import sys
import time
import types

import pytest

import stubs
stubs.stub()

from routers import global_stocks as gs  # noqa: E402

TILE = {"symbol": "N225", "name_zh": "日经225", "name_en": "Nikkei 225", "price": 50000.0, "change_pct": 1.0}


@pytest.fixture(autouse=True)
def fresh(monkeypatch):
    monkeypatch.setattr(gs, "_nikkei_cache", (0.0, None))
    monkeypatch.setitem(sys.modules, "routers.market", types.SimpleNamespace(_sentiment_data={}))
    monkeypatch.setattr(sys.modules["routers"], "market", sys.modules["routers.market"], raising=False)


def test_tile_is_fetched_once_per_five_minutes(monkeypatch):
    calls = []
    monkeypatch.setattr(gs, "_nikkei_fetch", lambda: calls.append(1) or dict(TILE))
    assert gs._jp_indices() == [TILE] and gs._jp_indices() == [TILE]
    assert len(calls) == 1


def test_sentiment_cache_is_the_fallback_when_the_fetch_fails(monkeypatch):
    def boom():
        raise RuntimeError("sina down")
    monkeypatch.setattr(gs, "_nikkei_fetch", boom)
    sys.modules["routers.market"]._sentiment_data = {"indices": [
        {"symbol": "^GSPC", "close": 1.0, "change_pct": 0.1}, {"symbol": "^N225", "close": 49000.5, "change_pct": -0.4}]}
    assert gs._jp_indices() == [{"symbol": "N225", "name_zh": "日经225", "name_en": "Nikkei 225",
                                 "price": 49000.5, "change_pct": -0.4}]


def test_no_index_when_both_sources_are_empty(monkeypatch):
    monkeypatch.setattr(gs, "_nikkei_fetch", lambda: None)
    assert gs._jp_indices() == []


def test_a_hung_fetch_is_given_up_on_and_not_retried_at_once(monkeypatch):
    monkeypatch.setattr(gs, "_NIKKEI_LIMIT", 0.2)
    started = []

    def hang():
        started.append(1)
        time.sleep(2)
    monkeypatch.setattr(gs, "_nikkei_fetch", hang)
    t0 = time.time()
    assert gs._jp_indices() == []
    assert time.time() - t0 < 1.5
    assert gs._jp_indices() == [] and len(started) == 1       # the failure is remembered for a minute


def test_an_older_reading_survives_a_failed_refresh(monkeypatch):
    monkeypatch.setattr(gs, "_nikkei_cache", (time.time() - 1, dict(TILE)))    # expired a second ago
    monkeypatch.setattr(gs, "_nikkei_fetch", lambda: None)
    assert gs._nikkei() == TILE


def test_sina_rows_become_the_tile_and_the_unfinished_session_is_skipped(monkeypatch):
    pd = pytest.importorskip("pandas")
    if not isinstance(getattr(pd, "__file__", None), str):           # stubs.py stands in for pandas where CI has none
        pytest.skip("needs the real pandas")
    frame = pd.DataFrame({"date": ["d1", "d2", "d3", "d4"], "close": [49000.0, 50000.0, 50500.0, 0.0]})
    monkeypatch.setitem(sys.modules, "akshare", types.SimpleNamespace(index_global_hist_sina=lambda symbol: (
        frame if symbol == "日经225指数" else None)))
    monkeypatch.setitem(sys.modules, "services.js_runtime", types.SimpleNamespace(v8_call_first=lambda fn, **kw: fn(**kw)))
    assert gs._nikkei_fetch() == {"symbol": "N225", "name_zh": "日经225", "name_en": "Nikkei 225",
                                  "price": 50500.0, "change_pct": 1.0}

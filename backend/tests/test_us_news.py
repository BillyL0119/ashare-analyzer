"""US per-stock news (routers/news.py) comes from Nasdaq alone: Yahoo's RSS answers 400. The sample file
has the shape api.nasdaq.com/api/news/topic/articlebysymbol returns (the fields services/move_reasons.py
reads: title, url, created, ago, publisher, primarysymbol, related_symbols); it was written by hand,
because Nasdaq cannot be reached reliably from the dev Mac. Check production after a deploy.
No network."""
import json
import pathlib
import time

import pytest

import stubs
stubs.stub()

from routers import news  # noqa: E402

SAMPLE = json.loads((pathlib.Path(__file__).parent / "nasdaq_news_sample.json").read_text())


class Resp:
    def __init__(self, body, status=200):
        self.body, self.status_code = body, status

    def json(self):
        return self.body


@pytest.fixture(autouse=True)
def fresh(monkeypatch):
    monkeypatch.setattr(news, "_nasdaq_cache", {})
    monkeypatch.setattr(news, "_result_cache", {})
    monkeypatch.setattr(news, "_us_name_keywords", lambda sym: list(news._US_NAME_ALIASES.get(sym, [])))
    monkeypatch.setattr(news, "_ai_overall_summary", lambda *a, **kw: "")      # filled in by a background thread


def nasdaq_says(monkeypatch, body, status=200, delay=0.0):
    calls = []

    def get(url, **kw):
        calls.append((url, kw))
        time.sleep(delay)
        return Resp(body, status)
    monkeypatch.setattr(news.requests, "get", get)
    return calls


def test_nasdaq_rows_parse_into_news_items(monkeypatch):
    calls = nasdaq_says(monkeypatch, SAMPLE)
    rows = news._fetch_nasdaq_symbol_news("AAPL")
    assert len(rows) == 4                                              # the row without a title is dropped
    assert calls[0][1]["params"]["q"] == "aapl|stocks"
    first = rows[0]
    assert first["title"].startswith("Apple (AAPL)") and first["source"] == "Zacks"
    assert first["url"] == "https://www.nasdaq.com/articles/apple-aapl-stock-rises-after-iphone-demand-update"
    assert first["_primary"] == "AAPL" and first["time"].endswith("+0000")
    assert rows[1]["url"].startswith("https://www.nasdaq.com/articles/better-buy")      # absolute urls stay


def test_only_items_about_the_ticker_survive(monkeypatch):
    nasdaq_says(monkeypatch, SAMPLE)
    items, complete = news._us_symbol_news("AAPL")
    titles = [i["title"] for i in items]
    assert complete is True
    assert any(t.startswith("Apple (AAPL)") for t in titles)
    assert any("Foxconn" in t for t in titles)                         # names Apple in the headline
    assert not any("Chip Stock" in t or "Wall Street" in t for t in titles)     # about other tickers / the market
    assert all("_related" not in i and "_primary" not in i for i in items)


def test_dotted_tickers_match_the_primary_symbol_without_the_dot(monkeypatch):
    body = {"data": {"rows": [{"title": "Why this conglomerate keeps buying", "url": "/a", "created": "Nov 14, 2026",
                               "ago": "2 days ago", "publisher": "Zacks", "primarysymbol": "BRK/B", "related_symbols": []}]}}
    nasdaq_says(monkeypatch, body)
    items, _ = news._us_symbol_news("BRK.B")
    assert len(items) == 1


def test_a_slow_nasdaq_answer_is_waited_for(monkeypatch):
    # 4.3 s from the server vs the old 2 s budget: the response was empty. Scaled down here.
    monkeypatch.setattr(news, "_NASDAQ_BUDGET", 2.0)
    nasdaq_says(monkeypatch, SAMPLE, delay=0.3)
    resp = news._get_news_base("AAPL", "us")
    assert len(resp["news"]) >= 2
    ts, _ = news._result_cache["AAPL_us"]
    assert time.time() - ts < 5                                        # a full-length cache entry


def test_a_nasdaq_answer_past_the_budget_is_cached_for_a_minute_and_lands_for_next_time(monkeypatch):
    monkeypatch.setattr(news, "_NASDAQ_BUDGET", 0.05)
    nasdaq_says(monkeypatch, SAMPLE, delay=0.4)
    resp = news._get_news_base("AAPL", "us")
    assert resp["news"] == []
    _expires_in(60)
    time.sleep(0.6)                                                    # the fetch finished in the background
    items, complete = news._us_symbol_news("AAPL")
    assert items and complete


def _expires_in(seconds, key="AAPL_us"):
    ts, _ = news._result_cache[key]
    left = ts + news._RESULT_TTL - time.time()
    assert seconds - 3 <= left <= seconds + 1, left


def test_an_empty_result_is_cached_for_60_seconds_not_30_minutes(monkeypatch):
    nasdaq_says(monkeypatch, {"data": {"rows": []}})
    resp = news._get_news_base("ZZZZ", "us")
    assert resp["news"] == []
    _expires_in(60, "ZZZZ_us")


def test_a_failing_nasdaq_gives_an_empty_short_lived_answer(monkeypatch):
    nasdaq_says(monkeypatch, {}, status=500)
    assert news._fetch_nasdaq_symbol_news("AAPL") == []
    resp = news._get_news_base("AAPL", "us")
    assert resp["news"] == []
    _expires_in(60)


def test_a_real_answer_is_cached_for_the_full_time(monkeypatch):
    nasdaq_says(monkeypatch, SAMPLE)
    news._get_news_base("AAPL", "us")
    _expires_in(news._RESULT_TTL)


def test_yahoo_is_not_asked_for_us_stocks(monkeypatch):
    urls = []
    monkeypatch.setattr(news.requests, "get", lambda url, **kw: (urls.append(url), Resp(SAMPLE))[1])
    news._get_news_base("AAPL", "us")
    assert urls and all("nasdaq.com" in u for u in urls)
    assert not hasattr(news, "_fetch_yahoo_rss_us")

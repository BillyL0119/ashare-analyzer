"""Nasdaq's economic calendar sometimes answers a weekday with no rows (2026-11-18: 88 events at noon, none an
hour later). macro._load_day must not cache that blank day over a good copy. No network."""
from datetime import date

import stubs
stubs.stub()

from routers import macro  # noqa: E402


class _Resp:
    def __init__(self, rows):
        self._rows = rows

    def json(self):
        return {"data": {"rows": self._rows}}


def test_empty_weekday_answer_keeps_the_last_good_copy(monkeypatch):
    day = date(2026, 11, 18)                                   # a Wednesday
    monkeypatch.setattr(macro, "_cache", {})
    good = [{"eventName": "Core Retail Sales", "gmt": "08:30", "country": "United States",
             "actual": "0.6%", "consensus": "0.4%", "previous": "1.1%"}]
    monkeypatch.setattr(macro.requests, "get", lambda *a, **kw: _Resp(good))
    first = macro._load_day(day)
    assert [e["name"] for e in first] == ["Core Retail Sales"]
    monkeypatch.setattr(macro.requests, "get", lambda *a, **kw: _Resp([]))
    assert macro._load_day(day) == first                       # the gap is not cached over it
    assert macro._cache["2026-11-18"][1] == first
    monkeypatch.setattr(macro, "_cache", {})
    assert macro._load_day(day) == [] and "2026-11-18" not in macro._cache   # never answered: nothing cached


def test_empty_weekend_is_cached(monkeypatch):
    monkeypatch.setattr(macro, "_cache", {})
    monkeypatch.setattr(macro.requests, "get", lambda *a, **kw: _Resp([]))
    assert macro._load_day(date(2026, 11, 22)) == [] and "2026-11-22" in macro._cache

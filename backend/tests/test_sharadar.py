"""Sharadar client: paging, key never leaks, point-in-time lookup. No network: requests.get is replaced."""
import pytest

from services import sharadar as sh


class _Resp:
    def __init__(self, status=200, payload=None):
        self.status_code, self._p = status, payload or {}

    def json(self):
        return self._p


def _page(cols, rows, cursor=None):
    return {"datatable": {"columns": [{"name": c} for c in cols], "data": rows}, "meta": {"next_cursor_id": cursor}}


@pytest.fixture(autouse=True)
def _key(monkeypatch):
    monkeypatch.setenv("NASDAQ_DATA_LINK_API_KEY", "SECRET-KEY-123")
    monkeypatch.setattr(sh.time, "sleep", lambda *_: None)


def test_fetch_follows_cursor_and_joins_lists(monkeypatch):
    calls = []
    pages = [_page(["ticker", "date"], [["A", "2020-01-02"]], "c1"), _page(["ticker", "date"], [["B", "2020-01-03"]])]

    def fake_get(url, params, timeout):
        calls.append(dict(params))
        return _Resp(200, pages[len(calls) - 1])
    monkeypatch.setattr(sh.requests, "get", fake_get)
    rows = sh.fetch("SHARADAR/SEP", {"ticker": ["A", "B"]}, ["ticker", "date"])
    assert rows == [{"ticker": "A", "date": "2020-01-02"}, {"ticker": "B", "date": "2020-01-03"}]
    assert calls[0]["ticker"] == "A,B" and "qopts.cursor_id" not in calls[0]
    assert calls[1]["qopts.cursor_id"] == "c1"


def test_errors_never_contain_the_key(monkeypatch):
    def boom(url, params, timeout):
        raise sh.requests.ConnectionError(f"failed for {url}?api_key={params['api_key']}")
    monkeypatch.setattr(sh.requests, "get", boom)
    with pytest.raises(sh.SharadarError) as e:
        sh.fetch("SHARADAR/SEP")
    assert "SECRET-KEY-123" not in str(e.value) and "ConnectionError" in str(e.value)

    monkeypatch.setattr(sh.requests, "get", lambda url, params, timeout: _Resp(403, {"quandl_error": {"code": "QEPx04"}}))
    with pytest.raises(sh.SharadarError) as e:
        sh.fetch("SHARADAR/SEP")
    assert "403" in str(e.value) and "SECRET-KEY-123" not in str(e.value)


def test_missing_key_is_a_clear_error(monkeypatch):
    monkeypatch.delenv("NASDAQ_DATA_LINK_API_KEY")
    assert not sh.configured()
    with pytest.raises(sh.SharadarError, match="not set"):
        sh.fetch("SHARADAR/SEP")


def test_prices_grouped_and_sorted(monkeypatch):
    cols = ["ticker", "date", "open", "high", "low", "close", "closeadj", "volume"]
    rows = [["A", "2020-01-03", 1, 2, 1, 2, 2, 10], ["A", "2020-01-02", 1, 2, 1, 1, 1, 10], ["B", "2020-01-02", 5, 5, 5, 5, 5, 1]]
    monkeypatch.setattr(sh.requests, "get", lambda url, params, timeout: _Resp(200, _page(cols, rows)))
    out = sh.prices(["A", "B"], "2020-01-01")
    assert [b["date"] for b in out["A"]] == ["2020-01-02", "2020-01-03"] and "ticker" not in out["A"][0]


def test_only_as_reported_fundamentals_are_allowed():
    with pytest.raises(ValueError):
        sh.fundamentals(["A"], "MRQ")


def test_known_as_of_uses_filing_date_not_period():
    rows = [{"datekey": "2020-02-15", "revenue": 1}, {"datekey": "2020-05-10", "revenue": 2}]
    assert sh.known_as_of(rows, "2020-02-14") is None
    assert sh.known_as_of(rows, "2020-02-15")["revenue"] == 1
    assert sh.known_as_of(rows, "2020-05-09")["revenue"] == 1
    assert sh.known_as_of(rows, "2021-01-01")["revenue"] == 2

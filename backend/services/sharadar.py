"""
Sharadar (Nasdaq Data Link) client: survivorship-free US prices and point-in-time fundamentals.

Used only by the admin research tools. The licence is personal, so the raw rows never go to a public route;
callers derive signals and return those.

Tables (https://data.nasdaq.com/databases/SFA):
  SHARADAR/TICKERS  one row per security: ticker, name, isdelisted, category, sector, firstpricedate, lastpricedate
  SHARADAR/SEP      daily prices incl. delisted names; `closeadj` is adjusted for splits and dividends
  SHARADAR/SF1      fundamentals; `datekey` is the day the figure became public, so filtering on it
                    (not on calendardate) keeps a back-test from using numbers nobody had yet

The API key comes from NASDAQ_DATA_LINK_API_KEY in backend/.env and is never logged or put in an error message.
Without a subscription the API answers only for a 30-stock, 4-month sample (2018-09..2018-12): enough to test code.
"""

import os
import time

import requests

BASE = "https://data.nasdaq.com/api/v3/datatables"
PER_PAGE = 10_000
MAX_PAGES = 400            # 4 million rows: a hard stop against a runaway cursor
TIMEOUT = 60


class SharadarError(RuntimeError):
    """Raised with a message that is safe to show (it never contains the key)."""


def configured() -> bool:
    return bool(os.getenv("NASDAQ_DATA_LINK_API_KEY"))


def _get(table: str, params: dict) -> dict:
    key = os.getenv("NASDAQ_DATA_LINK_API_KEY", "")
    if not key:
        raise SharadarError("NASDAQ_DATA_LINK_API_KEY is not set")
    try:
        r = requests.get(f"{BASE}/{table}.json", params={**params, "api_key": key}, timeout=TIMEOUT)
    except requests.RequestException as e:
        # the exception text contains the full URL, key included: say only what kind of failure it was
        raise SharadarError(f"{table}: request failed ({type(e).__name__})") from None
    if r.status_code != 200:
        try:
            err = (r.json().get("quandl_error") or {}).get("code", "")
        except ValueError:
            err = ""
        raise SharadarError(f"{table}: HTTP {r.status_code} {err}".strip())
    return r.json()


def fetch(table: str, filters: dict = None, columns: list = None, max_pages: int = MAX_PAGES) -> list:
    """All rows of a datatable as dicts, following the paging cursor. `filters` use the API's own names
    ({"ticker": ["AAPL", "MSFT"], "date.gte": "2020-01-01"}; a list is sent comma-joined)."""
    params = {"qopts.per_page": PER_PAGE}
    for k, v in (filters or {}).items():
        params[k] = ",".join(map(str, v)) if isinstance(v, (list, tuple, set)) else v
    if columns:
        params["qopts.columns"] = ",".join(columns)
    out, cursor = [], None
    for _ in range(max_pages):
        if cursor:
            params["qopts.cursor_id"] = cursor
        d = _get(table, params)
        names = [c["name"] for c in d["datatable"]["columns"]]
        out.extend(dict(zip(names, row)) for row in d["datatable"]["data"])
        cursor = (d.get("meta") or {}).get("next_cursor_id")
        if not cursor:
            return out
        time.sleep(0.1)     # stay well under the rate limit while paging a long history
    raise SharadarError(f"{table}: more than {max_pages} pages, narrow the filter")


def securities(tickers: list = None) -> list:
    """Security master (prices table only): includes delisted names, which is what removes survivorship bias."""
    f = {"table": "SEP"}
    if tickers:
        f["ticker"] = tickers
    return fetch("SHARADAR/TICKERS", f, ["ticker", "name", "isdelisted", "category", "sector", "industry",
                                          "firstpricedate", "lastpricedate"])


def prices(tickers: list, start: str = None, end: str = None) -> dict:
    """{ticker: [{"date", "open", "high", "low", "close", "closeadj", "volume"}...]} oldest first."""
    f = {"ticker": tickers}
    if start:
        f["date.gte"] = start
    if end:
        f["date.lte"] = end
    rows = fetch("SHARADAR/SEP", f, ["ticker", "date", "open", "high", "low", "close", "closeadj", "volume"])
    out = {}
    for r in rows:
        out.setdefault(r["ticker"], []).append({k: r[k] for k in r if k != "ticker"})
    for v in out.values():
        v.sort(key=lambda b: b["date"])
    return out


def fundamentals(tickers: list, dimension: str = "ARQ", columns: list = None) -> dict:
    """{ticker: [row...]} sorted by datekey. ARQ = as originally reported, quarterly (what was known then);
    MRQ would silently apply later restatements to the past, so it is not offered here."""
    if dimension not in ("ARQ", "ART", "ARY"):
        raise ValueError("only as-reported dimensions (ARQ, ART, ARY) are point-in-time")
    cols = columns or ["ticker", "dimension", "datekey", "reportperiod", "revenue", "netinc", "eps", "equity",
                       "assets", "debt", "ebitda", "fcf", "marketcap", "pe", "pb", "roe"]
    rows = fetch("SHARADAR/SF1", {"ticker": tickers, "dimension": dimension}, cols)
    out = {}
    for r in rows:
        out.setdefault(r["ticker"], []).append(r)
    for v in out.values():
        v.sort(key=lambda x: x["datekey"])
    return out


def known_as_of(rows: list, day: str) -> dict:
    """The latest fundamentals row whose datekey is on or before `day` (None before the first filing)."""
    best = None
    for r in rows:
        if r["datekey"] <= day:
            best = r
        else:
            break
    return best

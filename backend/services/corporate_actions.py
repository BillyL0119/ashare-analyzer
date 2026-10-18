"""
Corporate actions for paper trading: cash dividends, stock splits and A-share bonus shares.

Sources (official only):
  us  Nasdaq's dividend calendar (by ex-date, cash per share) and stock-split calendar
      (upcoming splits with ratio "new : old" and effective date), api.nasdaq.com
  cn  CNINFO dividend records per stock (送股 / 转增 / 派息 per 10 shares and the 除权日)
Hong Kong and Japan are not covered yet.

events(market, day, symbols) returns the actions taking effect on `day` (the market's local
date) for the given symbols, as dicts:
  {"type": "dividend", "symbol", "date", "cash": per share}
  {"type": "split",    "symbol", "date", "new": int, "old": int}
  {"type": "bonus",    "symbol", "date", "bonus": shares per share held}     (A-shares)
"""

import logging
import re
import time
from datetime import datetime

import requests

logger = logging.getLogger(__name__)

_NASDAQ = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130 Safari/537.36",
    "Accept": "application/json, text/plain, */*", "Origin": "https://www.nasdaq.com", "Referer": "https://www.nasdaq.com/",
}
_cn_cache: dict = {}            # symbol -> (day fetched, rows)


def _mdy(s: str) -> str | None:
    try:
        return datetime.strptime(s.strip(), "%m/%d/%Y").strftime("%Y-%m-%d")
    except Exception:
        return None


def _ratio(s: str) -> tuple[int, int] | None:
    m = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*", s or "")
    if not m:
        return None
    a, b = float(m.group(1)), float(m.group(2))
    if a <= 0 or b <= 0 or a == b or a != int(a) or b != int(b):
        return None
    return int(a), int(b)


def _us(day: str, symbols: set) -> list:
    out = []
    r = requests.get("https://api.nasdaq.com/api/calendar/dividends", params={"date": day}, headers=_NASDAQ, timeout=20)
    r.raise_for_status()
    rows = (((r.json().get("data") or {}).get("calendar") or {}).get("rows")) or []
    for row in rows:
        sym = (row.get("symbol") or "").strip().upper()
        if sym in symbols and _mdy(row.get("dividend_Ex_Date") or "") == day:
            try:
                cash = float(row.get("dividend_Rate"))
            except (TypeError, ValueError):
                continue
            if cash > 0:
                out.append({"type": "dividend", "symbol": sym, "date": day, "cash": cash})
    r = requests.get("https://api.nasdaq.com/api/calendar/splits", headers=_NASDAQ, timeout=20)
    r.raise_for_status()
    for row in ((r.json().get("data") or {}).get("rows")) or []:
        sym = (row.get("symbol") or "").strip().upper()
        ratio = _ratio(row.get("ratio") or "")
        if sym in symbols and ratio and _mdy(row.get("executionDate") or "") == day:
            out.append({"type": "split", "symbol": sym, "date": day, "new": ratio[0], "old": ratio[1]})
    return out


def _cn(day: str, symbols: set) -> list:
    import akshare as ak
    from services.js_runtime import V8_LOCK
    out = []
    for sym in sorted(symbols):
        hit = _cn_cache.get(sym)
        if hit and hit[0] == day:
            rows = hit[1]
        else:
            with V8_LOCK:                       # cninfo signs requests in the shared mini_racer
                df = ak.stock_dividend_cninfo(symbol=sym)
            rows = [] if df is None else df.to_dict("records")
            _cn_cache[sym] = (day, rows)
            time.sleep(0.3)
        for row in rows:
            if str(row.get("除权日") or "")[:10] != day:
                continue

            def per10(v):
                try:
                    f = float(v)
                    return f / 10 if f == f and f > 0 else 0.0      # NaN -> 0
                except (TypeError, ValueError):
                    return 0.0
            cash = per10(row.get("派息比例"))
            bonus = per10(row.get("送股比例")) + per10(row.get("转增比例"))
            if cash:
                out.append({"type": "dividend", "symbol": sym, "date": day, "cash": round(cash, 6)})
            if bonus:
                out.append({"type": "bonus", "symbol": sym, "date": day, "bonus": round(bonus, 6)})
    return out


def events(market: str, day: str, symbols: set) -> list:
    """Actions effective on `day` for `symbols`. Raises on a source failure so the caller retries."""
    if not symbols:
        return []
    if market == "us":
        return _us(day, {s.upper() for s in symbols})
    if market == "cn":
        return _cn(day, set(symbols))
    return []

"""
US stock market trading days (NYSE), for the quant desk's check dates and reminders.

Weekdays minus the NYSE full-day holidays listed below (published by NYSE; extend HOLIDAYS each year). Early
closes (the day after Thanksgiving, Christmas Eve) are trading days. Dates outside the listed years are treated as
weekday-only, so add the next year's holidays before it starts (the desk shows a note when they are missing).
"""
from datetime import date, timedelta

HOLIDAYS = {
    # 2026
    "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07",
    "2026-11-26", "2026-12-25",
    # 2027
    "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06",
    "2027-11-25", "2027-12-24",
    # 2028 (New Year's Day 2028 is a Saturday: NYSE does not close on Friday 2027-12-31)
    "2028-01-17", "2028-02-21", "2028-04-14", "2028-05-29", "2028-06-19", "2028-07-04", "2028-09-04", "2028-11-23",
    "2028-12-25",
}
KNOWN_YEARS = {2026, 2027, 2028}


def _d(x) -> date:
    return x if isinstance(x, date) else date.fromisoformat(str(x)[:10])


def is_trading_day(day) -> bool:
    d = _d(day)
    return d.weekday() < 5 and d.isoformat() not in HOLIDAYS


def next_trading_day(day, n: int = 1) -> date:
    """The n-th trading day after `day` (n=0: `day` itself if it trades, else the next one)."""
    d = _d(day)
    if n == 0:
        while not is_trading_day(d):
            d += timedelta(days=1)
        return d
    for _ in range(n):
        d += timedelta(days=1)
        while not is_trading_day(d):
            d += timedelta(days=1)
    return d


def last_trading_day(year: int, month: int) -> date:
    d = date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)
    while not is_trading_day(d):
        d -= timedelta(days=1)
    return d


def check_days(year: int, month: int, parts: int = 5) -> list:
    """The split trend rule's check days for the month that starts after (year, month) ends: the last trading day
    of (year, month) is part 0, the next trading days are parts 1..parts-1."""
    first = last_trading_day(year, month)
    return [first] + [next_trading_day(first, k) for k in range(1, parts)]

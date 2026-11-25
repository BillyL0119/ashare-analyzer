"""
The split trend rule as the desk publishes it (adopted 2026-11-25, see research/trend_timing.py):

  The money for the rule is in 5 equal parts. Part d checks the cap-weighted large-cap index on trading day d after
  each month-end (part 0 on the month's last trading day, parts 1-4 on the next four): it holds stocks when the
  index is at or above the average of its own last 10 checks, cash (T-bills) when below, and trades at the next
  day's close. Checking on five days instead of one takes out most of the luck of the calendar.

At or above the average of 10 checks including today's  <=>  today's level >= the average of the previous 9, so each
part's threshold for its next check is known in advance. It is published as a ratio to the index level on the
desk's data date; the server turns it into an SPY price with SPY's close on that date (the index and SPY move
almost together over a few weeks), so the check can be read off SPY's close (services/trend_split_live.py).
"""
import os

import numpy as np

from research.sharadar_data import COMPACT
from research.trend_timing import daily_index, invested_fraction
from services import us_calendar as uc

PARTS = 5


def _iso(d):
    s = str(int(d))
    return f"{s[:4]}-{s[4:6]}-{s[6:]}"


def real_month_ends(dates):
    """Row of each month's last trading day; the data's last row counts only if it is its month's last trading day."""
    ym = dates // 100
    ends = [int(i) for i in np.where(np.diff(ym) != 0)[0]]
    last = len(dates) - 1
    y, m = divmod(int(ym[last]), 100)
    if _iso(dates[last]) == uc.last_trading_day(y, m).isoformat():
        ends.append(last)
    return ends


def split_state(P, val=None):
    """Everything the desk needs about the split rule, plus the invested share per day (for the live record)."""
    if val is None:
        val = np.load(os.path.join(COMPACT, "valuation_monthly.npz"))
    level = daily_index(P, val)
    dates = P.dates
    last = len(dates) - 1
    ends = real_month_ends(dates)
    frac, made = invested_fraction(dates, level, ends, PARTS)
    as_of = _iso(dates[last])
    y, m = int(as_of[:4]), int(as_of[5:7])
    upcoming = uc.check_days(y, m, PARTS)
    after = uc.check_days(y + (m == 12), m % 12 + 1, PARTS)
    parts = []
    for d in range(PARTS):
        done = [(row, on) for (row, on), e in zip(made[d], ends) if e + d <= last]    # checks that have happened
        checks = [row for row, _ in done]
        nxt = upcoming[d] if upcoming[d].isoformat() > as_of else after[d]
        prev9 = [float(level[r]) for r in checks[-9:]]
        last_row, last_on = done[-1]
        parts.append({
            "part": d, "last_check": _iso(dates[last_row]), "last_invested": bool(last_on),
            "next_check": nxt.isoformat(),
            "threshold_ratio": round(float(np.mean(prev9)) / float(level[last]), 5) if len(prev9) == 9 else None,
        })
    calendar = []
    for k in range(13):                     # the next twelve months of check days
        yy, mm = y + (m - 1 + k) // 12, (m - 1 + k) % 12 + 1
        for d, day in enumerate(uc.check_days(yy, mm, PARTS)):
            if day.isoformat() > as_of:
                calendar.append({"date": day.isoformat(), "part": d})
    return {
        "parts_n": PARTS, "anchor_date": as_of, "fraction_now": round(float(frac[-1]), 2),
        "parts": parts, "calendar": calendar,
        "holidays_known_until": max(uc.KNOWN_YEARS),
    }, {_iso(dates[i]): float(frac[i]) for i in range(len(dates))}

"""
How much does the 10-month trend rule depend on the exact day it is checked? (audit, 2026-11-24)

    .venv/bin/python -m research.trend_timing      (from backend/)

A daily cap-weighted index of the ~1000 largest liquid US stocks (weights from each month-end market cap, held
through the month) is checked on trading day d after each month-end (d = 0..4): invested next period if the level
is at or above the average of the last 10 checks, else cash at the T-bill rate. The switch happens at the close of
the day AFTER the check (a decision cannot use a close and trade at that same close). Reported for the development
years (2005-01 .. 2020-10) and the hold-out (2020-11 ..). If the results swing a lot with d, the past protection was
partly luck of the calendar.
"""
import json
import math
import os
import sys

import numpy as np

from research.improve_study import DEV_END
from research.rates import monthly_cash_returns
from research.sharadar_data import COMPACT, Panel


def daily_index(P, val):
    ends = P.month_ends()
    raw = np.load(os.path.join(COMPACT, "prices.npz"))["closeunadj"]
    adj = P.adj
    ret = np.zeros(len(P.dates))
    for k in range(len(ends) - 1):
        i, j = ends[k], ends[k + 1]
        mc = val["marketcap"][k]
        with np.errstate(all="ignore"):
            ok = np.isfinite(adj[i]) & (adj[i] > 0) & (raw[i] >= 5) & (P.avg_dollar_volume(i) >= 5e6) & (mc > 0)
        cut = np.sort(mc[ok])[-1000] if ok.sum() > 1000 else 0
        mem = np.where(ok & (mc >= cut))[0]
        if len(mem) == 0:
            continue                                 # no valuation data yet (before 1998)
        w = mc[mem].astype(float)
        seg = adj[i: j + 1, mem].astype(float)
        rows = np.where(np.isfinite(seg), np.arange(len(seg))[:, None], 0)
        seg = seg[np.maximum.accumulate(rows, axis=0), np.arange(len(mem))]   # a stock with no bar keeps its last price
        rel = np.nan_to_num(seg / seg[0], nan=1.0, posinf=1.0)
        v = rel @ w / w.sum()
        ret[i + 1: j + 1] = v[1:] / v[:-1] - 1
    return np.cumprod(1 + ret)


def stats(r):
    r = np.asarray(r)
    yrs = len(r) / 252
    curve = np.cumprod(1 + r)
    peak = np.maximum.accumulate(curve)
    return {"cagr": round(float(curve[-1] ** (1 / yrs) - 1) * 100, 1), "max_drawdown": round(float((curve / peak - 1).min()) * 100, 1),
            "vol": round(float(np.std(r) * math.sqrt(252)) * 100, 1)}


def tranche_invested(dates, level, ends, d):
    """Invested flag per day for the part that checks on trading day d after each month-end (index row ends[k] + d):
    invested when the level that day is at or above the mean of this part's last 10 checks. The switch is traded at
    the close of the next day, so it applies to returns from two rows after the check. Also the list of checks
    [(row, invested)]."""
    checks = [min(e + d, len(dates) - 1) for e in ends]
    invested = np.ones(len(dates), bool)
    hist, made = [], []
    for c, nxt in zip(checks, checks[1:] + [len(dates) - 1]):
        hist.append(level[c])
        on = len(hist) < 10 or level[c] >= np.mean(hist[-10:])
        invested[c + 2: nxt + 2] = on
        made.append((c, bool(on)))
    return invested, made


def invested_fraction(dates, level, ends, parts=5):
    """The split rule: the money in `parts` equal parts, part d checking on day d after month-end (d = 0..parts-1).
    Returns the invested share per day (0, 0.2, .. 1) and each part's checks."""
    flags, made = zip(*(tranche_invested(dates, level, ends, d) for d in range(parts)))
    return np.mean(np.vstack(flags), axis=0), list(made)


def main():
    P = Panel()
    val = np.load(os.path.join(COMPACT, "valuation_monthly.npz"))
    level = daily_index(P, val)
    dates = P.dates
    dret = np.r_[0, level[1:] / level[:-1] - 1]
    months = sorted({int(d // 100) for d in dates})
    rf_m = dict(zip(months, monthly_cash_returns([m * 100 + 28 for m in months])))
    cash = np.array([rf_m.get(int(x // 100), 0.0) / 21 for x in dates])
    ends = P.month_ends()
    out = {}
    periods = (("dev", (dates >= 20050101) & (dates < DEV_END)), ("holdout", dates >= DEV_END))
    for d in range(5):
        invested, _ = tranche_invested(dates, level, ends, d)
        strat = np.where(invested, dret, cash)
        res = {name: {"index": stats(dret[sel]), "trend": stats(strat[sel])} for name, sel in periods}
        out[f"day {d}"] = res
        print(f"check on day {d} after month-end: dev trend {res['dev']['trend']} (index {res['dev']['index']}); "
              f"holdout trend {res['holdout']['trend']} (index {res['holdout']['index']})", flush=True)
    frac, _ = invested_fraction(dates, level, ends)
    strat = frac * dret + (1 - frac) * cash
    split = {name: {"index": stats(dret[sel]), "trend": stats(strat[sel]),
                    "partly_invested_days_pct": round(float(np.mean((frac[sel] > 0) & (frac[sel] < 1))) * 100, 1)}
             for name, sel in periods}
    print(f"SPLIT into 5 parts (days 0-4): dev {split['dev']['trend']}, holdout {split['holdout']['trend']}", flush=True)
    with open(os.path.join(COMPACT, "..", "reports", "trend_timing.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    with open(os.path.join(COMPACT, "..", "reports", "trend_split.json"), "w") as fh:
        json.dump(split, fh, indent=1)


if __name__ == "__main__":
    sys.exit(main())

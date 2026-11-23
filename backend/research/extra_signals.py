"""
Signals beyond prices and fundamentals, as (months x tickers) matrices aligned with Panel.month_ends().

Point in time: an event counts at the first month-end strictly after the day it became public
  insiders       SHARADAR/SF2 Form 4 filings, by filing date (officers and directors, open-market buys "P" and sells "S",
                 derivative securities left out). Data starts in 2008.
  institutions   SHARADAR/SF3A quarterly 13F totals per stock. A quarter's filings are due 45 days after it ends, so
                 a quarter counts only from 46 days after its end.
"""
import os

import numpy as np
import pandas as pd

from research.sharadar_data import COMPACT

RAW = os.path.join(COMPACT, "..")
INSIDER_MONTHS = 6


def _month_index(dates_ymd, event_days):
    """Index of the first month-end strictly after each event day (len(dates) when none)."""
    me = pd.to_datetime(pd.Series(dates_ymd.astype(str)), format="%Y%m%d").values
    return np.searchsorted(me, event_days.values.astype("datetime64[ns]"), side="right")


def insider_matrices(month_dates, tickers):
    """buyers: distinct officer/director open-market buyers over the last 6 months (summed by month);
    net_value: buys minus sells in dollars over the same window."""
    cols = ["ticker", "filingdate", "securityadcode", "transactioncode", "transactionvalue", "isofficer", "isdirector",
            "ownername"]
    parts = []
    for ch in pd.read_csv(os.path.join(RAW, "SF2.csv"), usecols=cols, chunksize=2_000_000):
        ch = ch[ch.transactioncode.isin(["P", "S"]) & ~ch.securityadcode.astype(str).str.startswith("D")
                & ((ch.isofficer == "Y") | (ch.isdirector == "Y"))]
        parts.append(ch)
    d = pd.concat(parts)
    pos = pd.Series(np.arange(len(tickers)), index=tickers)
    d = d[d.ticker.isin(pos.index)]
    d["k"] = _month_index(month_dates, pd.to_datetime(d.filingdate))
    d = d[d.k < len(month_dates)]
    d["c"] = pos.reindex(d.ticker.values).values
    d["value"] = d.transactionvalue.fillna(0).where(d.transactioncode == "P", -d.transactionvalue.fillna(0))
    buyers = d[d.transactioncode == "P"].groupby(["k", "c"]).ownername.nunique()
    net = d.groupby(["k", "c"]).value.sum()
    shape = (len(month_dates), len(tickers))
    b = np.zeros(shape, dtype=np.float32)
    v = np.zeros(shape, dtype=np.float32)
    b[buyers.index.get_level_values(0), buyers.index.get_level_values(1)] = buyers.values
    v[net.index.get_level_values(0), net.index.get_level_values(1)] = net.values
    kernel = np.ones(INSIDER_MONTHS)
    roll = lambda a: np.apply_along_axis(lambda x: np.convolve(x, kernel)[: len(x)], 0, a)   # noqa: E731
    b6, v6 = roll(b), roll(v)
    first = int(_month_index(month_dates, pd.Series(pd.to_datetime(["2008-01-01"])))[0]) + INSIDER_MONTHS
    b6[:first] = np.nan                                  # no Form 4 data before 2008
    v6[:first] = np.nan
    return {"insider_buyers": b6, "insider_net_value": v6}


def institution_matrices(month_dates, tickers, max_age_months=6):
    """Change in the number of institutions holding the stock, quarter on quarter, known 46 days after quarter end."""
    q = pd.read_csv(os.path.join(RAW, "SF3A.csv"), usecols=["date", "ticker", "shrholders"])
    pos = pd.Series(np.arange(len(tickers)), index=tickers)
    q = q[q.ticker.isin(pos.index)].copy()
    q["date"] = pd.to_datetime(q.date)
    q = q.sort_values(["ticker", "date"])
    prev = q.groupby("ticker").shrholders.shift(1)
    gap = (q.date - q.groupby("ticker").date.shift(1)).dt.days
    q["breadth"] = ((q.shrholders - prev) / prev.where(prev >= 5)).where(gap.between(80, 100))
    q = q.dropna(subset=["breadth"])
    q["k"] = _month_index(month_dates, q.date + pd.Timedelta(days=46))
    q = q[q.k < len(month_dates)]
    q["c"] = pos.reindex(q.ticker.values).values
    out = np.full((len(month_dates), len(tickers)), np.nan, dtype=np.float32)
    last = q.groupby(["c", "k"]).breadth.last().reset_index()
    for c, g in last.groupby("c"):                       # carry each value forward until the next one (max 6 months)
        ks, vals = g.k.values, g.breadth.values
        for i, k in enumerate(ks):
            end = min(ks[i + 1] if i + 1 < len(ks) else len(month_dates), k + max_age_months)
            out[k:end, c] = vals[i]
    return {"inst_breadth": out}

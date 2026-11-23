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


def earnings_reaction_matrix(panel, month_dates, max_age_months=3):
    """Abnormal return over the 3 days around each quarterly earnings release, known from the day after.

    Sharadar's datekey is the 10-Q/10-K filing date, often days or weeks after the press release, so the release day
    is found as the day of the largest volume surge (dollar volume / its previous 60-day average, divided by the same
    ratio for the whole market so market-wide panics do not count) between 10 days after the quarter ended and the day
    after the filing (a release after the close is traded the next day). Spot checks: right for most AAPL, NVDA, JPM
    quarters; some picks land on another big news day instead. Return = stock minus the equal-weight market, -1..+1."""
    f = pd.read_csv(os.path.join(COMPACT, "fundamentals.csv.gz"), usecols=["ticker", "reportperiod", "datekey"])
    f = f.drop_duplicates(["ticker", "reportperiod"]).sort_values(["ticker", "reportperiod"])
    dates = pd.to_datetime(pd.Series(panel.dates.astype(str)), format="%Y%m%d").values
    adj, dv = panel.adj, panel.dvol
    with np.errstate(all="ignore"):
        ret = adj[1:] / adj[:-1] - 1.0
    ret = np.vstack([np.full((1, adj.shape[1]), np.nan, dtype=np.float32), ret])
    ret[~np.isfinite(ret) | (np.abs(ret) > 0.9)] = np.nan
    liquid_day = np.nan_to_num(dv) >= 1e6
    mkt = np.nanmean(np.where(liquid_day, ret, np.nan), axis=1)
    month_end = pd.to_datetime(pd.Series(month_dates.astype(str)), format="%Y%m%d").values

    def surge_of(v):
        cs = np.concatenate([[0.0], np.cumsum(v)])
        idx = np.arange(len(v))
        lo = np.maximum(idx - 60, 0)
        avg = (cs[idx] - cs[lo]) / np.maximum(idx - lo, 1)
        return np.where((idx - lo >= 40) & (avg > 0), v / np.where(avg > 0, avg, 1), np.nan)
    market_surge = surge_of(np.nansum(dv.astype(float), axis=1))
    out = np.full((len(month_dates), adj.shape[1]), np.nan, dtype=np.float32)
    pos = pd.Series(np.arange(len(panel.tickers)), index=panel.tickers)
    f = f[f.ticker.isin(pos.index)]
    for t, g in f.groupby("ticker", sort=False):
        j = pos[t]
        v = dv[:, j].astype(float)
        if np.isfinite(v).sum() < 120:
            continue
        surge = surge_of(np.nan_to_num(v)) / market_surge                 # previous 60 days, not today
        starts = np.searchsorted(dates, (pd.to_datetime(g.reportperiod) + pd.Timedelta(days=10)).values)
        ends_ = np.searchsorted(dates, pd.to_datetime(g.datekey).values, side="right") + 1  # through the day after filing
        events = []
        for a, b in zip(starts, ends_):
            if b - a < 1 or a < 1 or b + 1 >= len(v):
                continue
            w = surge[a:b]
            if not np.isfinite(w).any():
                continue
            d = a + int(np.nanargmax(w))
            seg = ret[d - 1: d + 2, j]
            mseg = mkt[d - 1: d + 2]
            if np.isfinite(seg).sum() < 2:
                continue
            car = np.nanprod(1 + seg) - np.nanprod(1 + mseg)
            known = np.searchsorted(month_end, dates[d + 1], side="right")             # first month-end after day +1
            if known < len(month_dates):
                events.append((known, car))
        for i, (k, car) in enumerate(events):
            stop = min(events[i + 1][0] if i + 1 < len(events) else len(month_dates), k + max_age_months)
            out[k:stop, j] = car
    return out


SHORT_LAG_DAYS = 14       # FINRA publishes about 7-8 business days after the settlement date; count it from day 14


def short_interest_matrices(month_dates, tickers, max_age_months=2):
    """Shares sold short and days to cover from FINRA's twice-monthly files, as of each month-end: the latest file
    whose settlement date is at least SHORT_LAG_DAYS before the month-end."""
    folder = os.path.join(RAW, "finra")
    files = sorted(f for f in os.listdir(folder) if f.startswith("shrt"))
    pos = pd.Series(np.arange(len(tickers)), index=tickers)
    qty = np.full((len(month_dates), len(tickers)), np.nan, dtype=np.float64)
    dtc = np.full_like(qty, np.nan)
    stamp = np.full(qty.shape, -1, dtype=np.int64)          # which file filled the cell (later files win)
    me = pd.to_datetime(pd.Series(month_dates.astype(str)), format="%Y%m%d").values
    for n, f in enumerate(files):
        settle = pd.Timestamp(f[4:12])
        k0 = int(np.searchsorted(me, (settle + pd.Timedelta(days=SHORT_LAG_DAYS)).to_datetime64(), side="right"))
        if k0 >= len(month_dates):
            continue
        # names contain stray quotes, and the newest files quote every field: read raw, then strip the quotes
        d = pd.read_csv(os.path.join(folder, f), sep="|", quoting=3, dtype=str)
        d.columns = [c.strip('"') for c in d.columns]
        d = d[["symbolCode", "currentShortPositionQuantity", "daysToCoverQuantity"]].apply(lambda x: x.str.strip('"'))
        for col in ("currentShortPositionQuantity", "daysToCoverQuantity"):
            d[col] = pd.to_numeric(d[col], errors="coerce")
        d = d[d.symbolCode.isin(pos.index)]
        c = pos.reindex(d.symbolCode.values).values
        for k in range(k0, min(k0 + max_age_months, len(month_dates))):
            newer = stamp[k, c] < n
            qty[k, c[newer]] = d.currentShortPositionQuantity.values[newer]
            dtc[k, c[newer]] = d.daysToCoverQuantity.values[newer]
            stamp[k, c[newer]] = n
    return {"short_qty": qty, "days_to_cover": dtc}


def latest_short_settlement(as_of: str):
    """Settlement date (YYYY-MM-DD) of the newest FINRA file counted as known on `as_of`, or None."""
    folder = os.path.join(RAW, "finra")
    cut = pd.Timestamp(as_of) - pd.Timedelta(days=SHORT_LAG_DAYS)
    dates = [pd.Timestamp(f[4:12]) for f in os.listdir(folder) if f.startswith("shrt")] if os.path.isdir(folder) else []
    known = [d for d in dates if d < cut]
    return max(known).strftime("%Y-%m-%d") if known else None

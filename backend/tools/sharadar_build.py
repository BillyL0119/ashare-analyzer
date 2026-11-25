"""
Turn the raw Sharadar CSVs into compact files the research code loads in a second (local use, gitignored).

    backend/.venv/bin/python backend/tools/sharadar_build.py

Reads  backend/data/sharadar/{TICKERS,SEP,SF1}.csv   (made by sharadar_sync.py)
Writes backend/data/sharadar/compact/
    prices.npz        dates (YYYYMMDD int32), tickers, closeadj / closeunadj / dollar_volume (float32, dates x tickers,
                      NaN = no bar)
    valuation_monthly.npz  month-end rows of SHARADAR/DAILY (marketcap $m, pe, pb, ps, evebitda), same tickers;
                      DAILY uses only fundamentals already filed on that date
    securities.csv    one row per ticker in the matrix (name, sector, industry, isdelisted, first/last price date, ...)
    fundamentals.csv.gz  as-reported quarterly rows (dimension ARQ) with the columns the factors use, keyed on datekey

Universe: US common stock, primary and secondary classes, listed and delisted (preferreds, ADRs and Canadian names are
left out for now). closeadj is adjusted for splits and dividends, so returns computed from it are total returns.
"""
import os
import sys
import time

import numpy as np
import pandas as pd

RAW = os.path.join(os.path.dirname(__file__), "..", "data", "sharadar")
OUT = os.path.join(RAW, "compact")
CATEGORIES = {"Domestic Common Stock", "Domestic Common Stock Primary Class", "Domestic Common Stock Secondary Class"}
SF1_COLS = ["ticker", "dimension", "datekey", "reportperiod", "fiscalperiod", "revenue", "gp", "opinc", "ebit", "ebitda",
            "netinc", "eps", "epsdil", "assets", "equity", "liabilities", "debt", "cashneq", "ncfo", "capex", "fcf",
            "sharesbas", "shareswa", "marketcap", "ev", "pe", "pb", "ps", "roe", "roa", "grossmargin", "netmargin",
            "ncfdiv", "ncfcommon", "dps"]


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


VAL_COLS = ["marketcap", "pe", "pb", "ps", "evebitda"]


def build_valuation(dates, tick):
    """Month-end rows of DAILY as (months x tickers) matrices aligned with prices.npz."""
    ym = np.array([d[:7] for d in dates])
    month_end = dates[np.r_[ym[1:] != ym[:-1], True]]
    me = set(month_end)
    log(f"reading DAILY valuation, keeping {len(me)} month-ends...")
    parts = []
    for ch in pd.read_csv(os.path.join(RAW, "DAILY.csv"), usecols=["ticker", "date"] + VAL_COLS, chunksize=2_000_000,
                          dtype={c: "float32" for c in VAL_COLS}):
        parts.append(ch[ch.date.isin(me)])
    v = pd.concat(parts)
    ri = pd.Series(np.arange(len(month_end)), index=month_end).reindex(v.date.values).values
    ci = pd.Series(np.arange(len(tick)), index=tick).reindex(v.ticker.values).values
    ok = ~np.isnan(ci)
    out = {"dates": np.array([int(d.replace("-", "")) for d in month_end], dtype=np.int32), "tickers": tick}
    for c in VAL_COLS:
        m = np.full((len(month_end), len(tick)), np.nan, dtype=np.float32)
        m[ri[ok].astype(int), ci[ok].astype(int)] = v[c].values[ok]
        out[c] = m
    np.savez_compressed(os.path.join(OUT, "valuation_monthly.npz"), **out)
    log(f"valuation_monthly.npz: {np.isfinite(out['marketcap']).sum()} ticker-months with a market cap")


def main():
    os.makedirs(OUT, exist_ok=True)
    t = pd.read_csv(os.path.join(RAW, "TICKERS.csv"))
    sec = t[(t.table == "SEP") & t.category.isin(CATEGORIES)].copy()
    keep = set(sec.ticker)
    log(f"universe: {len(keep)} tickers ({(sec.isdelisted == 'Y').sum()} delisted)")

    log("reading prices (45 million rows)...")
    px = pd.read_csv(os.path.join(RAW, "SEP.csv"), usecols=["ticker", "date", "close", "closeadj", "closeunadj", "volume"],
                     dtype={"ticker": "category", "close": "float32", "closeadj": "float32", "closeunadj": "float32",
                            "volume": "float32"})
    px = px[px.ticker.isin(keep)]
    px["ticker"] = px.ticker.cat.remove_unused_categories()
    dates = np.sort(px.date.unique())
    di = pd.Series(np.arange(len(dates)), index=dates)
    rows = di.reindex(px.date.values).values
    tick = np.array(sorted(px.ticker.cat.categories))
    cols = pd.Series(np.arange(len(tick)), index=tick).reindex(px.ticker.astype(str).values).values
    adj = np.full((len(dates), len(tick)), np.nan, dtype=np.float32)
    dv = np.full_like(adj, np.nan)
    raw = np.full_like(adj, np.nan)
    adj[rows, cols] = px.closeadj.values
    raw[rows, cols] = px.closeunadj.values
    # SEP's close and volume are both split-adjusted, so their product is the dollars traded that day. (closeunadj x
    # volume overstated it before every later split, by 112x for Apple in 2004: a look-ahead that let future
    # winners pass the liquidity filter early. Fixed 2026-11-24.)
    dv[rows, cols] = (px.close.values.astype(np.float64) * px.volume.values).astype(np.float32)
    ymd = np.array([int(d.replace("-", "")) for d in dates], dtype=np.int32)
    del px
    log(f"matrix {adj.shape[0]} days x {adj.shape[1]} tickers, {np.isfinite(adj).mean() * 100:.1f}% filled")
    np.savez_compressed(os.path.join(OUT, "prices.npz"), dates=ymd, tickers=tick, closeadj=adj, closeunadj=raw,
                        dollar_volume=dv)
    del raw, dv
    sec = sec[sec.ticker.isin(tick)].set_index("ticker").loc[tick].reset_index()
    sec[["ticker", "permaticker", "name", "exchange", "isdelisted", "category", "sector", "industry", "scalemarketcap",
         "firstpricedate", "lastpricedate", "siccode"]].to_csv(os.path.join(OUT, "securities.csv"), index=False)
    log("saved prices.npz and securities.csv")

    build_valuation(dates, tick)

    log("reading fundamentals (as-reported quarterly)...")
    parts = []
    for ch in pd.read_csv(os.path.join(RAW, "SF1.csv"), chunksize=500_000, usecols=lambda c: c in SF1_COLS):
        parts.append(ch[(ch.dimension == "ARQ") & ch.ticker.isin(keep)])
    f = pd.concat(parts).sort_values(["ticker", "datekey"])
    f.to_csv(os.path.join(OUT, "fundamentals.csv.gz"), index=False)
    log(f"fundamentals: {len(f)} rows, {f.ticker.nunique()} tickers, datekey {f.datekey.min()} .. {f.datekey.max()}")
    for name in ("prices.npz", "valuation_monthly.npz", "securities.csv", "fundamentals.csv.gz"):
        log(f"{name}: {os.path.getsize(os.path.join(OUT, name)) / 1e6:.0f} MB")


if __name__ == "__main__":
    sys.exit(main())

"""
Turn the raw Sharadar CSVs into compact files the research code loads in a second (local use, gitignored).

    backend/.venv/bin/python backend/tools/sharadar_build.py

Reads  backend/data/sharadar/{TICKERS,SEP,SF1}.csv   (made by sharadar_sync.py)
Writes backend/data/sharadar/compact/
    prices.npz        dates (YYYYMMDD int32), tickers, closeadj / dollar_volume (float32, dates x tickers, NaN = no bar)
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
            "sharesbas", "shareswa", "marketcap", "ev", "pe", "pb", "ps", "roe", "roa", "grossmargin", "netmargin"]


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    t = pd.read_csv(os.path.join(RAW, "TICKERS.csv"))
    sec = t[(t.table == "SEP") & t.category.isin(CATEGORIES)].copy()
    keep = set(sec.ticker)
    log(f"universe: {len(keep)} tickers ({(sec.isdelisted == 'Y').sum()} delisted)")

    log("reading prices (45 million rows)...")
    px = pd.read_csv(os.path.join(RAW, "SEP.csv"), usecols=["ticker", "date", "closeadj", "closeunadj", "volume"],
                     dtype={"ticker": "category", "closeadj": "float32", "closeunadj": "float32", "volume": "float32"})
    px = px[px.ticker.isin(keep)]
    px["ticker"] = px.ticker.cat.remove_unused_categories()
    dates = np.sort(px.date.unique())
    di = pd.Series(np.arange(len(dates)), index=dates)
    rows = di.reindex(px.date.values).values
    tick = np.array(sorted(px.ticker.cat.categories))
    cols = pd.Series(np.arange(len(tick)), index=tick).reindex(px.ticker.astype(str).values).values
    adj = np.full((len(dates), len(tick)), np.nan, dtype=np.float32)
    dv = np.full_like(adj, np.nan)
    adj[rows, cols] = px.closeadj.values
    dv[rows, cols] = (px.closeunadj.values.astype(np.float64) * px.volume.values).astype(np.float32)
    ymd = np.array([int(d.replace("-", "")) for d in dates], dtype=np.int32)
    del px
    log(f"matrix {adj.shape[0]} days x {adj.shape[1]} tickers, {np.isfinite(adj).mean() * 100:.1f}% filled")
    np.savez_compressed(os.path.join(OUT, "prices.npz"), dates=ymd, tickers=tick, closeadj=adj, dollar_volume=dv)
    sec = sec[sec.ticker.isin(tick)].set_index("ticker").loc[tick].reset_index()
    sec[["ticker", "permaticker", "name", "exchange", "isdelisted", "category", "sector", "industry", "scalemarketcap",
         "firstpricedate", "lastpricedate", "siccode"]].to_csv(os.path.join(OUT, "securities.csv"), index=False)
    log("saved prices.npz and securities.csv")

    log("reading fundamentals (as-reported quarterly)...")
    parts = []
    for ch in pd.read_csv(os.path.join(RAW, "SF1.csv"), chunksize=500_000, usecols=lambda c: c in SF1_COLS):
        parts.append(ch[(ch.dimension == "ARQ") & ch.ticker.isin(keep)])
    f = pd.concat(parts).sort_values(["ticker", "datekey"])
    f.to_csv(os.path.join(OUT, "fundamentals.csv.gz"), index=False)
    log(f"fundamentals: {len(f)} rows, {f.ticker.nunique()} tickers, datekey {f.datekey.min()} .. {f.datekey.max()}")
    for name in ("prices.npz", "securities.csv", "fundamentals.csv.gz"):
        log(f"{name}: {os.path.getsize(os.path.join(OUT, name)) / 1e6:.0f} MB")


if __name__ == "__main__":
    sys.exit(main())

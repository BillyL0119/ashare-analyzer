"""Load the compact Sharadar files (see tools/sharadar_build.py). Local research only: personal licence."""
import os

import numpy as np
import pandas as pd

COMPACT = os.path.join(os.path.dirname(__file__), "..", "data", "sharadar", "compact")


class Panel:
    """dates (YYYYMMDD ints), tickers, closeadj and dollar_volume (dates x tickers, NaN = no bar), securities table."""

    def __init__(self):
        z = np.load(os.path.join(COMPACT, "prices.npz"), allow_pickle=False)
        self.dates = z["dates"]
        self.tickers = z["tickers"]
        self.adj = z["closeadj"]
        self.dvol = z["dollar_volume"]
        self.sec = pd.read_csv(os.path.join(COMPACT, "securities.csv")).set_index("ticker").loc[self.tickers]
        self.delisted = (self.sec.isdelisted == "Y").values

    def month_ends(self, start=None):
        """Row index of the last trading day of each month (the rebalance days)."""
        ym = self.dates // 100
        last = np.where(np.diff(ym, append=-1) != 0)[0]
        return last if start is None else last[self.dates[last] >= start]

    def avg_dollar_volume(self, i, window=60):
        return np.nan_to_num(self.dvol[max(0, i - window + 1): i + 1]).mean(axis=0)

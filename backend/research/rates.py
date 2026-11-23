"""3-month US Treasury bill rate (FRED series TB3MS, monthly average, % a year): what cash earns in the back-tests.

Cached in data/sharadar/rates/TB3MS.csv (gitignored with the rest of the research data) and refreshed when older than
7 days. A month with no figure yet (the current one) uses the latest published month.
"""
import csv
import io
import os
import time

import requests

PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sharadar", "rates", "TB3MS.csv")
URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=TB3MS"


def _fetch():
    r = requests.get(URL, timeout=30)
    r.raise_for_status()
    os.makedirs(os.path.dirname(PATH), exist_ok=True)
    tmp = PATH + ".tmp"
    with open(tmp, "w") as fh:
        fh.write(r.text)
    os.replace(tmp, PATH)


def tbill_annual() -> dict:
    """{YYYYMM (int): annual rate in % }"""
    if not os.path.exists(PATH) or time.time() - os.path.getmtime(PATH) > 7 * 86400:
        try:
            _fetch()
        except Exception:
            if not os.path.exists(PATH):
                raise
    out = {}
    with open(PATH) as fh:
        for row in csv.DictReader(io.StringIO(fh.read())):
            try:
                out[int(row["observation_date"][:7].replace("-", ""))] = float(row["TB3MS"])
            except (KeyError, ValueError):
                pass
    return out


def monthly_cash_returns(month_dates) -> list:
    """Cash return earned during each month (dates YYYYMMDD of the month's end), as a decimal."""
    rates = tbill_annual()
    latest = rates[max(rates)]
    return [(1 + rates.get(int(d) // 100, latest) / 100) ** (1 / 12) - 1 for d in month_dates]

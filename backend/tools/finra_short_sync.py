"""
Download FINRA's twice-monthly short interest files (public, no account) into backend/data/sharadar/finra/
(gitignored with the other research data). Files exist from the 2017-12-29 settlement on and cover exchange-listed
as well as OTC stocks.

    backend/.venv/bin/python backend/tools/finra_short_sync.py

Settlement dates are mid-month (the 15th or the business day before) and the last business day of the month, so
each half-month is probed from the 15th / month end backwards until a file answers. Existing files are skipped.
"""
import calendar
import os
import sys
import time
from datetime import date

import requests

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "sharadar", "finra")
URL = "https://cdn.finra.org/equity/otcmarket/biweekly/shrt{d}.csv"


def fetch(d):
    r = requests.get(URL.format(d=d.strftime("%Y%m%d")), timeout=30)
    return r.text if r.status_code == 200 and "|" in r.text[:200] else None


def main():
    os.makedirs(OUT, exist_ok=True)
    have = {f[4:12] for f in os.listdir(OUT) if f.startswith("shrt")}
    today = date.today()
    got = 0
    for y in range(2017, today.year + 1):
        for m in range(1, 13):
            if (y, m) < (2017, 12) or date(y, m, 1) > today:
                continue
            last = calendar.monthrange(y, m)[1]
            for start, stop in ((15, 9), (last, last - 6)):
                for day in range(start, stop, -1):
                    d = date(y, m, day)
                    if d > today or d.weekday() >= 5:
                        continue
                    key = d.strftime("%Y%m%d")
                    if key in have:
                        break
                    text = fetch(d)
                    time.sleep(0.05)
                    if text:
                        with open(os.path.join(OUT, f"shrt{key}.csv"), "w") as fh:
                            fh.write(text)
                        got += 1
                        break
    files = sorted(f for f in os.listdir(OUT) if f.startswith("shrt"))
    print(f"downloaded {got} new files; {len(files)} in total, {files[0][4:12]} .. {files[-1][4:12]}")


if __name__ == "__main__":
    sys.exit(main())

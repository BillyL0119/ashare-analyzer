"""
Build the history files for the "Be the Fed chair" game (services/governor_scenarios.py).

    python3 tools/build_governor.py                       # download the data, build all scenarios
    python3 tools/build_governor.py path/to/HISTDATA.TXT  # use a copy you already have

Writes data/governor/<id>.json: one row per quarter from two years before the scenario starts to
its end. History does not change, so this runs once and the files are committed.

Source: the Federal Reserve Board's FRB/US model database (data_only_package.zip, HISTDATA.TXT,
https://www.federalreserve.gov/econres/us-models-package.htm), which collects the official series
in one quarterly table:
  LUR     unemployment rate (BLS)
  LURNAT  natural rate of unemployment (Fed staff estimate)
  RFF     federal funds rate, quarterly average (Federal Reserve)
  PCNIA   PCE price index (BEA): the measure behind the Fed's 2% inflation target
  PCPI    consumer price index (BLS)
  PTR     surveyed inflation expected over the next ten years
  XGAP    output gap, % of potential GDP (Fed staff estimate)
"""
import csv
import io
import json
import os
import sys
import zipfile

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from services.governor_scenarios import SCENARIOS  # noqa: E402

OUT = os.path.join(HERE, "..", "data", "governor")
URL = "https://www.federalreserve.gov/econres/files/data_only_package.zip"
LEAD = 8          # quarters of history shown before the first decision


def load_rows(path: str | None) -> dict:
    if path:
        text = open(path, encoding="utf-8").read()
    else:
        r = requests.get(URL, timeout=120, headers={"User-Agent": "BestFriendStock/1.0 (bestfriendstock.com)"})
        r.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            name = next(n for n in z.namelist() if n.endswith("HISTDATA.TXT"))
            text = z.read(name).decode("utf-8")
    return {row["OBS"]: row for row in csv.DictReader(io.StringIO(text))}


def quarters(rows: dict, start: str, end: str) -> list[str]:
    keys = list(rows)
    return keys[keys.index(start): keys.index(end) + 1]


def build(sc: dict, rows: dict) -> dict:
    keys = list(rows)
    first = keys[keys.index(sc["start"]) - LEAD]
    out = []
    for q in quarters(rows, first, sc["end"]):
        i = keys.index(q)
        r, r1, r4 = rows[q], rows[keys[i - 1]], rows[keys[i - 4]]
        f = lambda row, k: float(row[k])  # noqa: E731
        out.append({
            "q": q,
            "u": round(f(r, "LUR"), 2),
            "un": round(f(r, "LURNAT"), 2),
            "ff": round(f(r, "RFF"), 2),
            "pce4": round((f(r, "PCNIA") / f(r4, "PCNIA") - 1) * 100, 2),        # % over four quarters
            "pceq": round(((f(r, "PCNIA") / f(r1, "PCNIA")) ** 4 - 1) * 100, 2),  # % a year, this quarter
            "cpi4": round((f(r, "PCPI") / f(r4, "PCPI") - 1) * 100, 2),
            "exp": round(f(r, "PTR"), 2),
            "gap": round(f(r, "XGAP"), 2),
        })
    return {"id": sc["id"], "start": sc["start"], "end": sc["end"], "lead": LEAD, "quarters": out,
            "source": "Federal Reserve Board, FRB/US model database (HISTDATA.TXT)"}


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else None
    rows = load_rows(path)
    os.makedirs(OUT, exist_ok=True)
    for sc in SCENARIOS:
        data = build(sc, rows)
        with open(os.path.join(OUT, f"{sc['id']}.json"), "w", encoding="utf-8") as fh:
            json.dump(data, fh, separators=(",", ":"))
        qs = data["quarters"]
        s = qs[LEAD]
        print(f"{sc['id']}: {len(qs)} quarters, start {s['q']} u={s['u']} pce4={s['pce4']} ff={s['ff']}, "
              f"end {qs[-1]['q']} u={qs[-1]['u']} pce4={qs[-1]['pce4']} ff={qs[-1]['ff']}")


if __name__ == "__main__":
    main()

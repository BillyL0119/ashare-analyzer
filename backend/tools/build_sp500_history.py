"""
Who was in the S&P 500, and when: the point-in-time universe of the factor lab (/factors).

  python -m tools.build_sp500_history            # download the membership list -> data/sp500_membership.json
  python -m tools.build_sp500_history --prices   # (on the server) fetch ten years of Nasdaq prices and dividends
                                                 # for past members, into the usual quote cache

Source: github.com/fja05680/sp500 (MIT licence), sp500_ticker_start_end.csv: one row per stay in the index
(ticker, start date, end date or blank). Tickers that only changed name are joined to today's ticker (RENAMES), so
the company keeps its history: Nasdaq serves past prices under the new ticker only.

Past members that were bought out or went bankrupt are no longer listed and Nasdaq has no prices for them; they stay
missing and the page says how many. The stays from 2015 on are kept (the lab tests ten years).
"""
import argparse
import csv
import io
import json
import os
import sys
import time
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

SRC = "https://raw.githubusercontent.com/fja05680/sp500/master/sp500_ticker_start_end.csv"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "sp500_membership.json")
SINCE = "2015-01-01"

# old ticker -> today's ticker, for companies that only changed ticker (or whose shares carried on under a new
# ticker) on the day the old one left the list. Checked against the company records.
RENAMES = {
    "ABC": "COR", "ANTM": "ELV", "ARNC": "HWM", "BBT": "TFC", "BHGE": "BKR", "BK": "BNY", "BLL": "BALL",
    "CDAY": "DAY", "COG": "CTRA", "CTL": "LUMN", "DISCA": "WBD", "DISCK": "WBD", "DWDP": "DD", "EQR": "VMRK",
    "FB": "META", "FI": "FISV", "FLT": "CPAY", "HRS": "LHX", "JEC": "J", "LB": "BBWI", "MMC": "MRSH",
    "MYL": "VTRS", "NLOK": "GEN", "PEAK": "DOC", "PKI": "RVTY", "RE": "EG", "SATS": "ECHO", "TMK": "GL",
    "UTX": "RTX", "WLTW": "WTW",
}


def _merge(spans: list) -> list:
    out = []
    for s, e in sorted(spans, key=lambda x: x[0]):
        if out and (out[-1][1] is None or out[-1][1] >= s):
            if out[-1][1] is not None and (e is None or e > out[-1][1]):
                out[-1][1] = e
            continue
        out.append([s, e])
    return out


def build(text: str) -> dict:
    spans: dict = {}
    for row in csv.DictReader(io.StringIO(text)):
        t, s, e = (row.get("ticker") or "").strip(), (row.get("start_date") or "").strip(), (row.get("end_date") or "").strip() or None
        if not t or not s or (e is not None and e < SINCE):
            continue
        spans.setdefault(RENAMES.get(t, t), []).append([s, e])
    members = {t: _merge(v) for t, v in sorted(spans.items())}
    last = max(max(s for s, _ in v) for v in members.values())
    last = max(last, max((e for v in members.values() for _, e in v if e), default=last))
    return {"source": "github.com/fja05680/sp500 (MIT licence)", "built": date.today().isoformat(),
            "last_change": last, "since": SINCE, "renames": RENAMES, "members": members}


def fetch_prices(pause: float = 1.0):
    from services import nasdaq as nq
    with open(OUT, encoding="utf-8") as f:
        members = json.load(f)["members"]
    have = ok = 0
    for t in members:
        if nq.cached_history(t):
            have += 1
            continue
        try:
            bars = nq.daily_history(t)
            if bars:
                nq.dividends(t)
                ok += 1
            print(t, len(bars), flush=True)
        except Exception as e:                      # one bad ticker never stops the run
            print(t, "failed:", e, flush=True)
        time.sleep(pause)
    print(f"{len(members)} past and present members: {have} already cached, {ok} fetched now")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--prices", action="store_true", help="fetch prices for the members not cached yet")
    a = ap.parse_args()
    if a.prices:
        fetch_prices()
    else:
        import requests
        r = requests.get(SRC, timeout=30)
        r.raise_for_status()
        data = build(r.text)
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
        print(f"{len(data['members'])} tickers, last change {data['last_change']} -> {OUT}")

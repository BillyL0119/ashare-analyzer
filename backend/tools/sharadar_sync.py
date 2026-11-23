"""
Download the Sharadar tables once, as bulk files, into backend/data/sharadar/ (gitignored, personal licence).

    backend/.venv/bin/python backend/tools/sharadar_sync.py            # TICKERS, SEP, SF1 (skips fresh files)
    backend/.venv/bin/python backend/tools/sharadar_sync.py --force    # download again

The data-tables API can hand over a whole table as one zipped CSV (`qopts.export=true`) instead of paging through
millions of rows. The download link is signed and short-lived, so it is never printed or stored.
"""
import argparse
import os
import sys
import time
import zipfile

import requests
from dotenv import load_dotenv

ROOT = os.path.join(os.path.dirname(__file__), "..")
load_dotenv(os.path.join(ROOT, ".env"))
OUT = os.path.join(ROOT, "data", "sharadar")
TABLES = ["TICKERS", "SEP", "SF1"]
BASE = "https://data.nasdaq.com/api/v3/datatables/SHARADAR"


def link_for(table: str, key: str) -> str:
    for attempt in range(60):                       # a large table can take a few minutes to prepare
        r = requests.get(f"{BASE}/{table}.json", params={"qopts.export": "true", "api_key": key}, timeout=60)
        if r.status_code != 200:
            sys.exit(f"{table}: HTTP {r.status_code}")
        f = (r.json().get("datatable_bulk_download") or {}).get("file") or {}
        if f.get("status") == "fresh" and f.get("link"):
            return f["link"]
        print(f"{table}: file is {f.get('status', '?')}, waiting...", flush=True)
        time.sleep(10)
    sys.exit(f"{table}: the export did not become ready")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("tables", nargs="*", default=TABLES)
    a = ap.parse_args()
    key = os.getenv("NASDAQ_DATA_LINK_API_KEY", "")
    if not key:
        sys.exit("NASDAQ_DATA_LINK_API_KEY is not set in backend/.env")
    os.makedirs(OUT, exist_ok=True)
    for table in a.tables:
        csv_path = os.path.join(OUT, f"{table}.csv")
        if os.path.exists(csv_path) and not a.force:
            print(f"{table}: already downloaded ({os.path.getsize(csv_path) / 1e6:.0f} MB), use --force to refresh")
            continue
        zpath = os.path.join(OUT, f"{table}.zip.part")
        t0 = time.time()
        for attempt in range(1, 9):                  # a long download can drop: resume from what is on disk
            have = os.path.getsize(zpath) if os.path.exists(zpath) else 0
            url = link_for(table, key)               # signed links expire: ask again on every attempt
            headers = {"Range": f"bytes={have}-"} if have else {}
            try:
                with requests.get(url, headers=headers, stream=True, timeout=120) as r:   # url is never printed
                    if r.status_code == 200 and have:        # server ignored Range: start over
                        have = 0
                    elif r.status_code not in (200, 206):
                        r.raise_for_status()
                    total = have + int(r.headers.get("Content-Length", 0))
                    last = time.time()
                    with open(zpath, "ab" if have else "wb") as fh:
                        for chunk in r.iter_content(1 << 20):
                            fh.write(chunk)
                            have += len(chunk)
                            if time.time() - last > 10:
                                print(f"{table}: {have / 1e6:.0f} / {total / 1e6:.0f} MB ({have * 100 // max(total, 1)}%)", flush=True)
                                last = time.time()
                break
            except (requests.RequestException, OSError) as e:
                print(f"{table}: attempt {attempt} interrupted at {have / 1e6:.0f} MB ({type(e).__name__}), resuming", flush=True)
                time.sleep(5)
        else:
            sys.exit(f"{table}: download failed after 8 attempts (partial file kept, run again to resume)")
        print(f"{table}: downloaded {have / 1e6:.0f} MB in {time.time() - t0:.0f}s", flush=True)
        with zipfile.ZipFile(zpath) as z:
            names = z.namelist()
            tmp = csv_path + ".tmp"
            with z.open(names[0]) as src, open(tmp, "wb") as dst:
                while True:
                    b = src.read(1 << 20)
                    if not b:
                        break
                    dst.write(b)
        os.replace(tmp, csv_path)
        os.remove(zpath)
        print(f"{table}: saved {os.path.getsize(csv_path) / 1e6:.0f} MB", flush=True)


if __name__ == "__main__":
    main()

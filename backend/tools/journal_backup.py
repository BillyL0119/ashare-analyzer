#!/usr/bin/env python3
"""
Daily snapshot of the investing journal on the server (cron, 03:30 server time):

    /root/ashare-analyzer/backend/data/journal/*.json  ->  /root/backups/journal/<YYYYMMDD-HHMM>/

Only when something changed since the newest snapshot, so a quiet month leaves one snapshot, not thirty. Keeps the
newest KEEP snapshots. The folder is readable by root only (the files are Billy's real account records). The Mac pulls
the current files every week (tools/journal_pull.py), so a lost server loses at most a week of entries.
Standard library only.
"""
import filecmp
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "journal")
DEST = os.environ.get("JOURNAL_BACKUP_DIR", "/root/backups/journal")
KEEP = 60


def snapshots(dest):
    return sorted(d for d in os.listdir(dest) if os.path.isdir(os.path.join(dest, d))) if os.path.isdir(dest) else []


def same(a, b):
    names = lambda d: sorted(f for f in os.listdir(d) if f.endswith(".json"))      # noqa: E731
    return names(a) == names(b) and all(filecmp.cmp(os.path.join(a, f), os.path.join(b, f), shallow=False) for f in names(a))


def main(src=SRC, dest=DEST, keep=KEEP) -> int:
    files = sorted(f for f in os.listdir(src) if f.endswith(".json")) if os.path.isdir(src) else []
    if not files:
        print("no journal files yet")
        return 0
    os.makedirs(dest, mode=0o700, exist_ok=True)
    os.chmod(dest, 0o700)
    snaps = snapshots(dest)
    if snaps and same(src, os.path.join(dest, snaps[-1])):
        print(f"unchanged since {snaps[-1]}")
        return 0
    name = time.strftime("%Y%m%d-%H%M%S")
    out, n = os.path.join(dest, name), 1
    while os.path.exists(out):                    # two snapshots in the same second
        out, n = os.path.join(dest, f"{name}-{n}"), n + 1
    os.makedirs(out, mode=0o700)
    for f in files:
        shutil.copy2(os.path.join(src, f), os.path.join(out, f))
    for d in snapshots(dest)[:-keep]:
        shutil.rmtree(os.path.join(dest, d))
    print(f"saved {len(files)} file(s) to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

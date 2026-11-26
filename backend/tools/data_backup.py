#!/usr/bin/env python3
"""
Daily backup of the site's own data on the server (cron, 03:40 server time):

    users, roles, classes, paper-trading accounts, comments, analytics, history-trading and Fed-game runs, the case
    library and the move reasons  ->  /root/backups/data/<YYYYMMDD-HHMMSS>.tar.gz  (+ latest.tar.gz)

Not included: caches that rebuild themselves (us_cache, price_cache, *.cache.json, ...), the Sharadar-derived quant desk
files (rebuilt on the Mac), the investing journal (tools/journal_backup.py keeps its own stricter copies) and backend/.env
(API keys are not copied around automatically). The backup folder is readable by root only: it holds account e-mails and
class rosters. The Mac pulls latest.tar.gz weekly (tools/data_pull.py). Keeps the newest KEEP archives. Standard library only.
"""
import hashlib
import os
import shutil
import sys
import tarfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
DEST = os.environ.get("DATA_BACKUP_DIR", "/root/backups/data")
KEEP = 60
INCLUDE = ["users.json", "roles.json", "analytics.json", "classes", "paper_trading", "comments", "governor_runs",
           "time_machine_runs", "econ_cases.json", "move_reasons.json"]
SKIP_SUFFIX = (".lock", ".tmp")


def files(data):
    """[(archive name, path)] of everything to back up, sorted."""
    out = []
    for item in INCLUDE:
        p = os.path.join(data, item)
        if os.path.isfile(p):
            out.append((item, p))
        elif os.path.isdir(p):
            for root, _, names in os.walk(p):
                for n in names:
                    if not n.endswith(SKIP_SUFFIX):
                        full = os.path.join(root, n)
                        out.append((os.path.relpath(full, data), full))
    return sorted(out)


def fingerprint(items) -> str:
    h = hashlib.sha256()
    for name, path in items:
        try:
            with open(path, "rb") as fh:
                h.update(name.encode() + b"\0" + hashlib.sha256(fh.read()).digest())
        except OSError:
            pass
    return h.hexdigest()


def main(data=DATA, dest=DEST, keep=KEEP) -> int:
    items = files(data)
    if not items:
        print("no data files found")
        return 1
    os.makedirs(dest, mode=0o700, exist_ok=True)
    os.chmod(dest, 0o700)
    marker = os.path.join(dest, ".last-fingerprint")
    fp = fingerprint(items)
    try:
        if open(marker).read().strip() == fp and os.path.exists(os.path.join(dest, "latest.tar.gz")):
            print("unchanged since the last archive")
            return 0
    except OSError:
        pass
    out = os.path.join(dest, f"{time.strftime('%Y%m%d-%H%M%S')}-{time.time_ns()}.tar.gz")      # sorts oldest first
    tmp = out + ".part"
    with tarfile.open(tmp, "w:gz") as tar:
        for arc, path in items:
            try:
                tar.add(path, arcname=arc, recursive=False)
            except OSError:
                pass                                   # a file removed while we read: skip it
    os.chmod(tmp, 0o600)
    with tarfile.open(tmp) as tar:                     # read it back before keeping it
        count = len(tar.getnames())
    os.replace(tmp, out)
    shutil.copy2(out, os.path.join(dest, "latest.tar.gz.part"))
    os.replace(os.path.join(dest, "latest.tar.gz.part"), os.path.join(dest, "latest.tar.gz"))
    with open(marker, "w") as fh:
        fh.write(fp)
    archives = sorted(f for f in os.listdir(dest) if f[:2] == "20" and f.endswith(".tar.gz"))
    for old in archives[:-keep]:
        os.remove(os.path.join(dest, old))
    print(f"saved {count} files -> {out} ({os.path.getsize(out) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

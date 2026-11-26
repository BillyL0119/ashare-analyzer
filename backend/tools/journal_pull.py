#!/usr/bin/env python3
"""
Weekly copy of the investing journal from the server to this Mac (started by tools/quant_weekly.sh):

    server data/journal/*.json  ->  ~/Documents/BFS-backups/journal/<YYYY-MM-DD>/

The files are Billy's real account records: the folder is private (mode 700) and the disk is FileVault-encrypted. Each
copy is opened and counted before it is kept; a copy that does not parse is reported and removed, so a good older copy
is never replaced by a broken one. Keeps the newest 26 copies. Prints one line; exit status 1 when it failed.
"""
import json
import os
import shutil
import subprocess
import sys
import time

SERVER = "root@43.132.172.8"
KEY = os.path.expanduser("~/.ssh/id_ed25519")
REMOTE = os.environ.get("JOURNAL_PULL_REMOTE", "/root/ashare-analyzer/backend/data/journal")
DEST = os.environ.get("JOURNAL_PULL_DIR", os.path.expanduser("~/Documents/BFS-backups/journal"))
KEEP = 26


def main() -> int:
    os.makedirs(DEST, mode=0o700, exist_ok=True)
    os.chmod(DEST, 0o700)
    tmp = os.path.join(DEST, f".incoming-{os.getpid()}")
    os.makedirs(tmp, mode=0o700)
    try:
        r = subprocess.run(["scp", "-q", "-i", KEY, "-o", "BatchMode=yes", f"{SERVER}:{REMOTE}/*.json", tmp],
                           capture_output=True, text=True, timeout=120)
        files = sorted(f for f in os.listdir(tmp) if f.endswith(".json"))
        if r.returncode != 0 and not files:
            if "No such file" in r.stderr:
                print("no journal on the server yet")
                return 0
            print("journal pull failed:", r.stderr.strip()[:200])
            return 1
        entries = 0
        for f in files:
            with open(os.path.join(tmp, f), encoding="utf-8") as fh:
                entries += len(json.load(fh).get("entries", []))
            os.chmod(os.path.join(tmp, f), 0o600)
        out = os.path.join(DEST, time.strftime("%Y-%m-%d"))
        if os.path.exists(out):
            shutil.rmtree(out)
        os.rename(tmp, out)
        for d in sorted(x for x in os.listdir(DEST) if x[:2] == "20")[:-KEEP]:
            shutil.rmtree(os.path.join(DEST, d))
        print(f"journal backup: {entries} entries in {len(files)} file(s) -> {out}")
        return 0
    except (ValueError, OSError, subprocess.TimeoutExpired) as e:
        print("journal pull failed:", e)
        return 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())

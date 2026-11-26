#!/usr/bin/env python3
"""
Weekly copy of the server's data archive to this Mac (started by tools/quant_weekly.sh, at most daily):

    server /root/backups/data/latest.tar.gz  ->  ~/Documents/BFS-backups/data/<YYYY-MM-DD>.tar.gz

The archive holds account e-mails and class rosters: the folder is private (mode 700) and the disk is FileVault-encrypted.
A download that does not open as a tar.gz, or has no users.json, is rejected so a good older copy is never replaced.
Keeps the newest 26. Prints one line; exit status 1 on failure.
"""
import os
import subprocess
import sys
import tarfile
import time

SERVER = "root@43.132.172.8"
KEY = os.path.expanduser("~/.ssh/id_ed25519")
REMOTE = os.environ.get("DATA_PULL_REMOTE", "/root/backups/data/latest.tar.gz")
DEST = os.environ.get("DATA_PULL_DIR", os.path.expanduser("~/Documents/BFS-backups/data"))
KEEP = 26


def main() -> int:
    os.makedirs(DEST, mode=0o700, exist_ok=True)
    os.chmod(DEST, 0o700)
    tmp = os.path.join(DEST, f".incoming-{os.getpid()}.tar.gz")
    try:
        r = subprocess.run(["scp", "-q", "-i", KEY, "-o", "BatchMode=yes", f"{SERVER}:{REMOTE}", tmp],
                           capture_output=True, text=True, timeout=180)
        if r.returncode != 0:
            print("data pull failed:", r.stderr.strip()[:200])
            return 1
        with tarfile.open(tmp) as tar:
            names = tar.getnames()
        if "users.json" not in names:
            print("data pull rejected: no users.json in the archive")
            return 1
        os.chmod(tmp, 0o600)
        out = os.path.join(DEST, time.strftime("%Y-%m-%d") + ".tar.gz")
        os.replace(tmp, out)
        for old in sorted(f for f in os.listdir(DEST) if f[:2] == "20")[:-KEEP]:
            os.remove(os.path.join(DEST, old))
        print(f"data backup: {len(names)} files -> {out} ({os.path.getsize(out) // 1024} KB)")
        return 0
    except (tarfile.TarError, OSError, subprocess.TimeoutExpired) as e:
        print("data pull failed:", e)
        return 1
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


if __name__ == "__main__":
    sys.exit(main())

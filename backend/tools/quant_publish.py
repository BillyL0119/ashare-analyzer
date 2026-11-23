"""
Weekly refresh of the admin research desk, run on Billy's Mac (the Sharadar data never leaves it):

    backend/.venv/bin/python backend/tools/quant_publish.py --refresh   # new data, rebuild, score, upload (~10 min)
    backend/.venv/bin/python backend/tools/quant_publish.py             # score the data already here and upload
    backend/.venv/bin/python backend/tools/quant_publish.py --no-upload # build the file only

Upload: scp of backend/data/quant/signals.json to the server (same path), written to a temp name and moved into
place so the site never reads half a file. Uses the deploy key ~/.ssh/id_ed25519.
"""
import argparse
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
PY = sys.executable
SERVER = "root@43.132.172.8"
KEY = os.path.expanduser("~/.ssh/id_ed25519")
REMOTE_DIR = "/root/ashare-analyzer/backend/data/quant"


def step(cmd, **kw):
    print("→", " ".join(cmd[-3:]) if len(cmd) > 3 else " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="download the Sharadar tables again and rebuild")
    ap.add_argument("--no-upload", action="store_true")
    a = ap.parse_args()
    if a.refresh:
        step([PY, os.path.join(HERE, "sharadar_sync.py"), "--force", "TICKERS", "SEP", "SF1", "DAILY"])
        step([PY, os.path.join(HERE, "sharadar_build.py")])
    step([PY, "-m", "research.signals"], cwd=BACKEND)
    if a.no_upload:
        return
    local = os.path.join(BACKEND, "data", "quant", "signals.json")
    ssh = ["-i", KEY, "-o", "BatchMode=yes"]
    step(["ssh", *ssh, SERVER, f"mkdir -p {REMOTE_DIR}"])
    step(["scp", "-q", *ssh, local, f"{SERVER}:{REMOTE_DIR}/signals.json.tmp"])
    step(["ssh", *ssh, SERVER, f"mv {REMOTE_DIR}/signals.json.tmp {REMOTE_DIR}/signals.json"])
    print("uploaded: the admin desk shows it on the next page load")


if __name__ == "__main__":
    main()

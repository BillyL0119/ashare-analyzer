"""
Weekly refresh of the admin research desk, run on Billy's Mac (the Sharadar data never leaves it):

    backend/.venv/bin/python backend/tools/quant_publish.py --refresh   # new data, rebuild, score, upload (~10 min)
    backend/.venv/bin/python backend/tools/quant_publish.py             # score the data already here and upload
    backend/.venv/bin/python backend/tools/quant_publish.py --no-upload # build the file only

Upload: scp of backend/data/quant/signals.json to the server (same path), written to a temp name and moved into
place so the site never reads half a file, then the week's AI reading is written on the server
(tools/quant_explain_refresh.py). Uses the deploy key ~/.ssh/id_ed25519.
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
    ssh = ["-i", KEY, "-o", "BatchMode=yes"]
    state = os.path.join(BACKEND, "data", "quant", "live_state.json")
    if not os.path.exists(state):           # a new or wiped Mac: carry on the live record from the server's backup
        os.makedirs(os.path.dirname(state), exist_ok=True)
        subprocess.run(["scp", "-q", *ssh, f"{SERVER}:{REMOTE_DIR}/live_state.json", state], capture_output=True)
    step([PY, "-m", "research.signals"], cwd=BACKEND)
    if a.no_upload:
        return
    local = os.path.join(BACKEND, "data", "quant", "signals.json")
    step(["ssh", *ssh, SERVER, f"mkdir -p {REMOTE_DIR}"])
    step(["scp", "-q", *ssh, local, f"{SERVER}:{REMOTE_DIR}/signals.json.tmp"])
    step(["ssh", *ssh, SERVER, f"mv {REMOTE_DIR}/signals.json.tmp {REMOTE_DIR}/signals.json"])
    print("uploaded: the admin desk shows it on the next page load")
    step(["scp", "-q", *ssh, state, f"{SERVER}:{REMOTE_DIR}/live_state.json"])          # backup of the live record
    # this week's AI reading, written on the server (the DeepSeek key lives there); a failure leaves the page's button
    r = subprocess.run(["ssh", *ssh, SERVER, "cd /root/ashare-analyzer/backend && BFS_NO_WARMUP=1 "
                        "/root/ashare-venv/bin/python tools/quant_explain_refresh.py"], capture_output=True, text=True)
    print((r.stdout or r.stderr).strip().splitlines()[-1] if (r.stdout or r.stderr).strip() else "AI reading: no output")


if __name__ == "__main__":
    main()

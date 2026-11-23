"""
Write the AI reading for the signals file now on this machine (run on the server by tools/quant_publish.py after an
upload, so the desk opens with this week's reading already there). Same checks and cap as the page's button.

    cd backend && BFS_NO_WARMUP=1 /root/ashare-venv/bin/python tools/quant_explain_refresh.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(BACKEND, ".env"))

from services import quant_explain as qe  # noqa: E402

QUANT = os.path.join(BACKEND, "data", "quant")


def main():
    with open(os.path.join(QUANT, "signals.json")) as fh:
        sig = json.load(fh)
    key = qe.cache_key(sig)
    path = os.path.join(QUANT, "explain.json")
    try:
        with open(path, encoding="utf-8") as fh:
            if key in json.load(fh):
                print("AI reading already written for this file")
                return 0
    except (OSError, ValueError):
        pass
    for attempt in (1, 2):                      # a rejected answer is tried once more
        res = qe.generate(sig)
        if res:
            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump({key: res}, fh, ensure_ascii=False)
            os.replace(tmp, path)
            print(f"AI reading written (attempt {attempt})")
            return 0
    print("AI reading not written (no key, daily cap, or the answer failed the checks); the page offers a button")
    return 1


if __name__ == "__main__":
    sys.exit(main())

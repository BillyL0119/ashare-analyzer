"""
Which role this server process plays.

The site runs two copies of the backend (see tools/restart_backend.sh): the main one on port 8001 and a STANDBY on
8002 that nginx uses only while the main one restarts during a deploy. Both read and write the same files, so the
standby must not run anything that changes data on its own: the paper-trading order matcher and corporate-action
pass, the daily report, the AI case writer, the cache warm-up loops. It only answers requests, with cold caches.
Start it with BFS_STANDBY=1.
"""
import os


def standby() -> bool:
    return os.environ.get("BFS_STANDBY") == "1"

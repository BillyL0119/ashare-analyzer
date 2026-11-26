#!/bin/bash
# Restart the backend without a gap (run on the server after `git pull` and the frontend build):
#
#   1. restart the STANDBY copy (port 8002, BFS_STANDBY=1: answers requests only, no background jobs)
#      and wait until it answers: nobody is using it, nginx sends traffic to the main copy
#   2. restart the MAIN copy (port 8001): for the ~4 s it is starting, nginx's `backup` server (the standby, already
#      on the new code) answers instead of an error
# First run (or a lost pm2 list) creates the standby. nginx: `upstream bfs_backend { server 127.0.0.1:8001;
# server 127.0.0.1:8002 backup; }`. Do NOT use `pm2 restart all`: it restarts both at once.
set -u
VENV=/root/ashare-venv/bin
APP=/root/ashare-analyzer/backend
wait_up() {   # port, seconds
  for _ in $(seq 1 $(( $2 * 2 ))); do
    [ "$(curl -s -o /dev/null -m 2 -w '%{http_code}' "http://127.0.0.1:$1/robots.txt")" = "200" ] && return 0
    sleep 0.5
  done
  return 1
}
if pm2 describe backend-standby >/dev/null 2>&1; then
  pm2 restart backend-standby >/dev/null
else
  pm2 start bash --name backend-standby --cwd "$APP" -- -c \
    "BFS_STANDBY=1 $VENV/uvicorn main:app --host 127.0.0.1 --port 8002 --no-server-header" >/dev/null
  pm2 save >/dev/null
fi
if ! wait_up 8002 60; then echo "standby did not start: main copy left alone" >&2; exit 1; fi
pm2 restart backend >/dev/null
if wait_up 8001 90; then echo "backend restarted without a gap"; else echo "main copy did not come back: standby is serving" >&2; exit 1; fi

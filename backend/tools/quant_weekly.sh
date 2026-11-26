#!/bin/zsh
# Weekly refresh of the admin quant desk, started by launchd (~/Library/LaunchAgents/com.bestfriendstock.quant-weekly.plist):
# download the Sharadar tables again, rebuild, score and upload. Writes a dated log and shows a macOS notification.
# A run that already succeeded in the last 5 days is skipped, so the catch-up run at login does not repeat it.
set -u
REPO="$HOME/ashare-analyzer"
LOGDIR="$HOME/Library/Logs/bestfriendstock"
STAMP="$LOGDIR/quant-last-success"
mkdir -p "$LOGDIR"
LOG="$LOGDIR/quant-weekly-$(date +%Y-%m-%d).log"

notify() { /usr/bin/osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true; }

# Copy of the investing journal from the server (Billy's real trades), at most once a day and independent of the
# quant refresh below: runs at every start (Saturday 10:00 and at login), so a copy is never more than a few days old.
JSTAMP="$LOGDIR/journal-last-success"
if [[ "${1:-}" == "--force" || ! -f "$JSTAMP" || -z "$(find "$JSTAMP" -mtime -1 2>/dev/null)" ]]; then
  if out=$("$REPO/backend/.venv/bin/python" "$REPO/backend/tools/journal_pull.py" 2>&1); then
    date "+%Y-%m-%d %H:%M" > "$JSTAMP"
    echo "$(date) $out" >> "$LOGDIR/journal-backup.log"
  else
    echo "$(date) FAILED: $out" >> "$LOGDIR/journal-backup.log"
    notify "投资记录备份失败" "${out:0:120}"
  fi
fi

if [[ "${1:-}" != "--force" && -f "$STAMP" && -n "$(find "$STAMP" -mtime -5 2>/dev/null)" ]]; then
  echo "$(date) skipped: last success $(cat "$STAMP")" >> "$LOGDIR/quant-weekly-skips.log"
  exit 0
fi

echo "=== $(date) start" >> "$LOG"
if "$REPO/backend/.venv/bin/python" "$REPO/backend/tools/quant_publish.py" --refresh >> "$LOG" 2>&1; then
  date "+%Y-%m-%d %H:%M" > "$STAMP"
  summary=$(grep -o 'as of [0-9-]*, [0-9]* stocks, trend [a-z]* ([^)]*)' "$LOG" | tail -1)
  echo "=== $(date) done: $summary" >> "$LOG"
  notify "量化研究台已更新" "${summary:-uploaded}"
else
  code=$?
  echo "=== $(date) FAILED (exit $code)" >> "$LOG"
  notify "量化研究台更新失败" "看日志：$LOG"
  exit $code
fi
# keep 12 weeks of logs
find "$LOGDIR" -name 'quant-weekly-20*.log' -mtime +84 -delete 2>/dev/null
exit 0

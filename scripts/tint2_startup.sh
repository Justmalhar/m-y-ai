#!/bin/bash
# tint2 startup — lightweight taskbar / panel
set -e

DISP=":${DISPLAY_NUM:-1}"
export DISPLAY="$DISP"

echo "[tint2] Starting taskbar on ${DISP} ..."
tint2 > /tmp/tint2.log 2>&1 &
TINT2_PID=$!

# Wait for tint2 window to appear
timeout=20
start=$(date +%s)
while ! xdotool search --class "tint2" >/dev/null 2>&1; do
    if ! kill -0 "$TINT2_PID" 2>/dev/null; then
        echo "[tint2] ERROR: process died early. Log:" >&2
        cat /tmp/tint2.log >&2
        exit 1
    fi
    if [ $(( $(date +%s) - start )) -gt $timeout ]; then
        echo "[tint2] Timeout waiting — continuing"
        break
    fi
    sleep 0.5
done

echo "[tint2] Ready (PID ${TINT2_PID})"

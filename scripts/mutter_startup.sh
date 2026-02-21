#!/bin/bash
# mutter startup — compositing window manager
set -e

DISP=":${DISPLAY_NUM:-1}"
export DISPLAY="$DISP"

echo "[mutter] Starting window manager on ${DISP} ..."
XDG_SESSION_TYPE=x11 mutter --replace --sm-disable > /tmp/mutter.log 2>&1 &
MUTTER_PID=$!

# Wait for mutter to appear on the display
timeout=20
start=$(date +%s)
while ! xdotool search --class "mutter" >/dev/null 2>&1; do
    if ! kill -0 "$MUTTER_PID" 2>/dev/null; then
        echo "[mutter] ERROR: process died early. Log:" >&2
        cat /tmp/mutter.log >&2
        exit 1
    fi
    if [ $(( $(date +%s) - start )) -gt $timeout ]; then
        # mutter started but class may not be searchable — continue anyway
        echo "[mutter] Timeout waiting for class detection — continuing"
        break
    fi
    sleep 0.5
done

echo "[mutter] Ready (PID ${MUTTER_PID})"

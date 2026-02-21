#!/bin/bash
# x11vnc startup — VNC server with auto-restart on crash
set -e

DISP=":${DISPLAY_NUM:-1}"
PORT="${VNC_PORT:-5901}"
export DISPLAY="$DISP"

echo "[x11vnc] Starting VNC server on port ${PORT} (display ${DISP}) ..."

start_x11vnc() {
    x11vnc \
        -display "$DISP" \
        -nopw \
        -listen 0.0.0.0 \
        -rfbport "$PORT" \
        -forever \
        -shared \
        -wait 50 \
        -quiet \
        > /tmp/x11vnc.log 2>&1 &
    echo $!
}

X11VNC_PID=$(start_x11vnc)

# Wait until port is listening
timeout=15
start=$(date +%s)
while ! netstat -tuln 2>/dev/null | grep -q ":${PORT} "; do
    if ! kill -0 "$X11VNC_PID" 2>/dev/null; then
        echo "[x11vnc] ERROR: process died. Log:" >&2
        cat /tmp/x11vnc.log >&2
        exit 1
    fi
    if [ $(( $(date +%s) - start )) -gt $timeout ]; then
        echo "[x11vnc] ERROR: port ${PORT} not open after ${timeout}s" >&2
        exit 1
    fi
    sleep 0.5
done

echo "[x11vnc] Listening on port ${PORT} (PID ${X11VNC_PID})"

# Background watchdog — restarts x11vnc if it crashes
(
    while true; do
        sleep 5
        if ! kill -0 "$X11VNC_PID" 2>/dev/null; then
            echo "[x11vnc] Crashed — restarting ..." >&2
            X11VNC_PID=$(start_x11vnc)
        fi
    done
) &

#!/bin/bash
# Xvfb startup — virtual framebuffer X server
set -e

DPI=96
RES_AND_DEPTH="${WIDTH:-1280}x${HEIGHT:-768}x24"
DISP=":${DISPLAY_NUM:-1}"

# Check if already running
if [ -e "/tmp/.X${DISPLAY_NUM:-1}-lock" ]; then
    echo "[xvfb] Already running on display ${DISP}"
    exit 0
fi

echo "[xvfb] Starting on display ${DISP} (${RES_AND_DEPTH}) ..."
Xvfb "$DISP" \
    -ac \
    -screen 0 "$RES_AND_DEPTH" \
    -retro \
    -dpi $DPI \
    -nolisten tcp \
    -nolisten unix &
XVFB_PID=$!

# Wait until display is ready
timeout=15
start=$(date +%s)
export DISPLAY="$DISP"
while ! xdpyinfo >/dev/null 2>&1; do
    if [ $(( $(date +%s) - start )) -gt $timeout ]; then
        echo "[xvfb] ERROR: failed to start within ${timeout}s" >&2
        kill "$XVFB_PID" 2>/dev/null || true
        exit 1
    fi
    sleep 0.2
done

echo "[xvfb] Ready (PID ${XVFB_PID})"

#!/bin/bash
# noVNC startup — browser-based VNC web proxy
set -e

VNC_PORT="${VNC_PORT:-5901}"
NOVNC_PORT="${NOVNC_PORT:-6080}"

echo "[noVNC] Starting web proxy on port ${NOVNC_PORT} → VNC ${VNC_PORT} ..."

/opt/noVNC/utils/novnc_proxy \
    --vnc "localhost:${VNC_PORT}" \
    --listen "${NOVNC_PORT}" \
    --web /opt/noVNC \
    > /tmp/novnc.log 2>&1 &
NOVNC_PID=$!

# Wait until port is listening
timeout=15
start=$(date +%s)
while ! netstat -tuln 2>/dev/null | grep -q ":${NOVNC_PORT} "; do
    if ! kill -0 "$NOVNC_PID" 2>/dev/null; then
        echo "[noVNC] ERROR: process died. Log:" >&2
        cat /tmp/novnc.log >&2
        exit 1
    fi
    if [ $(( $(date +%s) - start )) -gt $timeout ]; then
        echo "[noVNC] Timeout — port ${NOVNC_PORT} not open. Continuing anyway."
        break
    fi
    sleep 0.5
done

echo "[noVNC] http://localhost:${NOVNC_PORT}/vnc.html (PID ${NOVNC_PID})"

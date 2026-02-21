#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# m-y-ai entrypoint  ─  starts the full desktop stack then the Node.js gateway
# Startup order: Xvfb → mutter → tint2 → x11vnc → noVNC → gateway
# ─────────────────────────────────────────────────────────────────────────────
set -e

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

export DISPLAY=":${DISPLAY_NUM:-1}"
export WIDTH="${WIDTH:-1280}"
export HEIGHT="${HEIGHT:-768}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║            m-y-ai Ubuntu Desktop  ·  Starting           ║"
echo "╚══════════════════════════════════════════════════════════╝"

# 1 ─ Virtual display
"$SCRIPTS_DIR/xvfb_startup.sh"

# 2 ─ Window manager
"$SCRIPTS_DIR/mutter_startup.sh"

# 3 ─ Taskbar
"$SCRIPTS_DIR/tint2_startup.sh"

# 4 ─ VNC server
"$SCRIPTS_DIR/x11vnc_startup.sh"

# 5 ─ noVNC web proxy
"$SCRIPTS_DIR/novnc_startup.sh"

echo ""
echo "  VNC (native)  ─  vnc://localhost:${VNC_PORT:-5901}"
echo "  VNC (browser) ─  http://localhost:${NOVNC_PORT:-6080}/vnc.html"
echo "  Gateway API   ─  http://localhost:4227"
echo ""

# 6 ─ Node.js gateway (foreground — keeps container alive)
exec node /app/gateway.js

# ─────────────────────────────────────────────────────────────────────────────
# m-y-ai Dockerfile  —  Ubuntu 22.04 with full desktop + VNC + Node.js gateway
# ─────────────────────────────────────────────────────────────────────────────

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DEBIAN_PRIORITY=high

# ── 1. Core system & desktop dependencies ────────────────────────────────────
RUN apt-get update && apt-get -y upgrade && \
    apt-get install -y --no-install-recommends \
    # TLS / network
    ca-certificates \
    curl \
    wget \
    gnupg \
    net-tools \
    netcat \
    # Build tools
    build-essential \
    python3 \
    # Dev tools
    git \
    unzip \
    xz-utils \
    # System helpers
    procps \
    sudo \
    software-properties-common \
    # ── Virtual display & VNC ────────────────────────────────────────────────
    xvfb \
    x11vnc \
    xdotool \
    xterm \
    x11-apps \
    x11-utils \
    # ── Window manager & taskbar ─────────────────────────────────────────────
    mutter \
    tint2 \
    # ── Screenshot & image tools (for Claude computer-use) ───────────────────
    scrot \
    imagemagick \
    # ── Desktop apps ─────────────────────────────────────────────────────────
    gedit \
    xpaint \
    galculator \
    pcmanfm \
    xpdf \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Firefox ESR via mozillateam PPA ───────────────────────────────────────
RUN add-apt-repository ppa:mozillateam/ppa && \
    apt-get update && \
    apt-get install -y --no-install-recommends firefox-esr && \
    rm -rf /var/lib/apt/lists/*

# ── 3. LibreOffice ───────────────────────────────────────────────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends libreoffice && \
    rm -rf /var/lib/apt/lists/*

# ── 4. noVNC (browser-based VNC client) ──────────────────────────────────────
RUN git clone --branch v1.5.0 --depth 1 https://github.com/novnc/noVNC.git /opt/noVNC && \
    git clone --branch v0.12.0 --depth 1 https://github.com/novnc/websockify /opt/noVNC/utils/websockify && \
    ln -sf /opt/noVNC/vnc.html /opt/noVNC/index.html

# ── 5. Node.js 20 via NodeSource ─────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN node --version && npm --version

# ── 6. App working directory ──────────────────────────────────────────────────
WORKDIR /app

# ── 7. npm dependencies (best cache layer) ───────────────────────────────────
COPY package*.json ./
RUN npm install --production

# ── 8. Claude Code CLI ───────────────────────────────────────────────────────
RUN npm install -g @anthropic-ai/claude-code

# ── 9. Opencode CLI ──────────────────────────────────────────────────────────
RUN curl -fsSL https://opencode.ai/install | bash

# ── 10. Copy full application source ─────────────────────────────────────────
COPY . .

# ── 11. Make all scripts executable ──────────────────────────────────────────
RUN chmod +x /app/scripts/*.sh

# ── 12. Non-root user ────────────────────────────────────────────────────────
RUN useradd -m -s /bin/bash m-y-ai && \
    echo "m-y-ai ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers && \
    chown -R m-y-ai:m-y-ai /app

# ── 13. Environment ──────────────────────────────────────────────────────────
ENV PATH="/home/m-y-ai/.opencode/bin:/home/m-y-ai/.local/bin:${PATH}"
ENV HOME=/home/m-y-ai
ENV DISPLAY_NUM=1
ENV DISPLAY=":1"
ENV HEIGHT=768
ENV WIDTH=1280
ENV VNC_PORT=5901
ENV NOVNC_PORT=6080

# ── 14. Move opencode into user home ─────────────────────────────────────────
RUN cp -r /root/.opencode /home/m-y-ai/.opencode 2>/dev/null || true && \
    chown -R m-y-ai:m-y-ai /home/m-y-ai

# ── 15. Seed storage & Claude config (as non-root) ───────────────────────────
USER m-y-ai
RUN mkdir -p /home/m-y-ai/

USER root
COPY --chown=m-y-ai:m-y-ai storage/ /home/m-y-ai/
USER m-y-ai

RUN mkdir -p /home/m-y-ai/.claude && \
    echo '{}' > /home/m-y-ai/.claude/statsig_metadata.json && \
    echo '{"hasCompletedOnboarding":true}' > /home/m-y-ai/.claude/settings.json

# ── 16. tint2 config for the m-y-ai user ─────────────────────────────────────
RUN mkdir -p /home/m-y-ai/.config/tint2

# ── 17. Expose ports ──────────────────────────────────────────────────────────
#  4227  →  Node.js gateway / REST API
#  5901  →  VNC  (native VNC client)
#  6080  →  noVNC web UI  ─  http://localhost:6080/vnc.html
EXPOSE 4227
EXPOSE 5901
EXPOSE 6080

# ── 18. Entrypoint ────────────────────────────────────────────────────────────
ENTRYPOINT ["/app/scripts/entrypoint.sh"]

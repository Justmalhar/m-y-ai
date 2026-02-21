#!/usr/bin/env bash
set -e

# Install Docker if missing
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

# Prompt for required keys
echo ""
echo "=== M-Y-AI Setup ==="
echo ""

if [ ! -f .env ]; then
  cp .env.example .env

  read -rp "Anthropic API key: " ANTHROPIC_KEY
  sed -i "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=${ANTHROPIC_KEY}|" .env

  echo ""
  echo "Config saved to .env"
fi

# Build and start
docker compose up -d --build

echo ""
echo "=== Running ==="
echo "Scan QR to connect to M-Y-AI: http://$(hostname -I | awk '{print $1}'):4227/qr"
echo "Status:      http://$(hostname -I | awk '{print $1}'):4227/"
echo "Logs:        docker compose logs -f"

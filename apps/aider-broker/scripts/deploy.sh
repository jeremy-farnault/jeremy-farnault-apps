#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REMOTE_DIR="/opt/aider"

echo "==> Building @jf/aider-broker"
pnpm --filter @jf/aider-broker build

echo "==> Installing bundle to ${REMOTE_DIR}/broker.cjs"
sudo install -o jeremy -g jeremy -m 644 \
  "${REPO_ROOT}/apps/aider-broker/dist/index.cjs" \
  "${REMOTE_DIR}/broker.cjs"

echo "==> Restarting aider-broker"
sudo systemctl restart aider-broker
sleep 1
systemctl is-active aider-broker

echo "==> Smoke test"
SECRET="$(sudo grep -oP 'AIDER_PI_SHARED_SECRET=\K.*' /etc/systemd/system/aider-broker.service)"
curl -sf -H "Authorization: Bearer ${SECRET}" http://localhost:8787/health && echo
echo "Deployed OK"

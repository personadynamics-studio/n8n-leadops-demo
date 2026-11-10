#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
docker info >/dev/null
docker compose up -d --build --wait
if ! docker compose exec -T n8n n8n export:workflow --id=LeadOpsDemoV1 --output=/tmp/leadops-check.json >/dev/null 2>&1 || [ "${LEADOPS_REIMPORT:-0}" = 1 ]; then
  docker compose exec -T n8n n8n import:workflow --input=/demo/workflows/leadops.json
fi
docker compose exec -T n8n n8n publish:workflow --id=LeadOpsDemoV1
docker compose restart n8n
echo 'Stack started. Wait for docker compose ps to show healthy. Workbench: http://localhost:3000 | n8n: http://localhost:5678'

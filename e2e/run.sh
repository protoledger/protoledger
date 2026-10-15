#!/usr/bin/env bash
# Прогон демо в браузере из контейнера Playwright: браузер и его библиотеки ставить на машину не нужно.
# Движок с интерфейсом уже слушает адрес (по умолчанию docker compose up — http://127.0.0.1:8080).
# Использование (из корня репозитория): bash e2e/run.sh [адрес]
# Скриншоты и сводка — e2e/out/. DEMO_VIDEO=1 bash e2e/run.sh — ещё и запись экрана e2e/out/demo.webm.
set -euo pipefail
url="${1:-http://127.0.0.1:8080}"
cd "$(dirname "$0")/.."
docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/npm \
  -e DEMO_VIDEO="${DEMO_VIDEO:-}" \
  -v "$PWD:/w" -w /w/e2e mcr.microsoft.com/playwright:v1.63.0-noble \
  sh -c "npm ci --no-audit --no-fund --loglevel=error && node demo.mjs '$url' /w/e2e/out"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Deploy start: $(date -Iseconds) =="
echo "ROOT_DIR=$ROOT_DIR"

cd "$ROOT_DIR"

echo "== Git update =="
git rev-parse --is-inside-work-tree >/dev/null
git fetch origin main
git pull --ff-only origin main

echo "== Next.js install/build =="
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build

echo "== PM2 restart Next.js =="
PM2_APP_NAME="${PM2_APP_NAME:-myeverything-next}"
PORT="${PORT:-3000}"

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start "npm run start -- --port ${PORT}" --name "$PM2_APP_NAME"
fi
pm2 save

if [[ "${APPLY_NGINX_SYNC_PROXY:-0}" == "1" ]]; then
  echo "== Nginx: proxy /sync/ to Next.js =="
  bash "$ROOT_DIR/scripts/server/apply-nginx-sync-proxy.sh"
else
  echo "Skip: nginx /sync/ proxy (set APPLY_NGINX_SYNC_PROXY=1 to enable)"
fi

echo "== Expo web export (static) =="
if [[ -d "$ROOT_DIR/mobile" && -f "$ROOT_DIR/mobile/package.json" ]]; then
  pushd "$ROOT_DIR/mobile" >/dev/null
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  # Export static web bundle to mobile/dist
  npx expo export --platform web --output-dir dist
  popd >/dev/null
else
  echo "Skip: mobile/ not found"
fi

echo "== Health checks =="
# Next.js는 basePath/redirect 설정에 따라 / 가 404/redirect일 수 있어
# 항상 존재하는 /sync/logs 로 헬스체크(로그가 없어도 ok:true로 응답)
# NOTE: 3xx(리다이렉트)도 "문제"로 보고 실패 처리해 Location 중복을 조기에 잡는다.
HC_URL="http://127.0.0.1:${PORT}/sync/logs?n=1"
HC_CODE="$(curl -sS -o /dev/null -w "%{http_code}" "$HC_URL" || echo "000")"
if [[ "$HC_CODE" != "200" ]]; then
  echo "healthcheck failed: $HC_URL (http $HC_CODE)" >&2
  exit 1
fi

echo "== Deploy done: $(date -Iseconds) =="


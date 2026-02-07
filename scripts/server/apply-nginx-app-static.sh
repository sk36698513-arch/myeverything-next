#!/usr/bin/env bash
set -euo pipefail

# Serve Expo web export at /app/
#
# What this does:
# - Finds nginx config that contains `server_name $DOMAIN`
# - Adds location blocks to serve `${APP_DIST}` at `/app/`
# - Reloads nginx
#
# Usage (on server):
#   APP_DIST="/var/www/myeverything-next/mobile/dist" DOMAIN="myeverything.kr" bash scripts/server/apply-nginx-app-static.sh
#
# Notes:
# - Works with interactive sudo (will prompt), and also works with passwordless sudo.

DOMAIN="${DOMAIN:-myeverything.kr}"
APP_DIST="${APP_DIST:-/var/www/myeverything-next/mobile/dist}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing command: $1" >&2; exit 1; }
}

need_cmd python3

NGINX_T_OUT="$(
  (sudo nginx -T 2>/dev/null || true) || true
  nginx -T 2>/dev/null || true
)"

if [[ -z "$NGINX_T_OUT" ]]; then
  echo "failed: nginx -T output is empty" >&2
  echo "hint: install nginx or run as a user with permissions" >&2
  exit 1
fi

TARGET_FILE="$(
  python3 - <<'PY'
import re, sys
domain = sys.argv[1]
text = sys.stdin.read().splitlines()
cur = None
hit = None
for line in text:
  m = re.match(r"^\s*#\s*configuration file\s+(.+?):\s*$", line)
  if m:
    cur = m.group(1).strip()
    continue
  if cur and ("server_name" in line) and (domain in line):
    hit = cur
    break
if not hit:
  for line in text:
    if line.strip().startswith("# configuration file") and domain in line:
      hit = line.split("configuration file",1)[1].split(":",1)[0].strip()
      break
print(hit or "")
PY
)" <<<"$NGINX_T_OUT" "$DOMAIN"

if [[ -z "$TARGET_FILE" ]]; then
  echo "failed: could not locate nginx config for domain=$DOMAIN" >&2
  echo "hint: run 'sudo nginx -T | grep -n \"server_name.*$DOMAIN\"' on the server" >&2
  exit 1
fi

echo "nginx config target: $TARGET_FILE"
echo "app dist dir: $APP_DIST"

sudo python3 - <<'PY' "$TARGET_FILE" "$DOMAIN" "$APP_DIST"
import os, re, sys

path = sys.argv[1]
domain = sys.argv[2]
app_dist = sys.argv[3].rstrip("/") + "/"

with open(path, "r", encoding="utf-8") as f:
  src = f.read()

if "location ^~ /app/" in src or "location = /app/index.html" in src:
  print("skip: /app static locations already exist")
  raise SystemExit(0)

lines = src.splitlines(True)

def find_server_block_indices(lines, domain):
  i = 0
  while i < len(lines):
    if re.search(r"^\s*server\s*\{", lines[i]):
      start = i
      depth = 0
      j = i
      while j < len(lines):
        depth += lines[j].count("{")
        depth -= lines[j].count("}")
        if depth == 0 and j > start:
          block = "".join(lines[start:j+1])
          if re.search(r"^\s*server_name\s+[^;]*\b" + re.escape(domain) + r"\b", block, re.M):
            return start, j
          break
        j += 1
      i = j + 1
      continue
    i += 1
  return None

idx = find_server_block_indices(lines, domain)
if not idx:
  raise SystemExit(f"failed: server block for {domain} not found in {path}")

start, end = idx
block_lines = lines[start:end+1]

# insert after server_name line
insert_at = None
indent = "  "
for k, line in enumerate(block_lines):
  m = re.match(r"^(\s*)server_name\s+.*\b" + re.escape(domain) + r"\b.*;\s*$", line)
  if m:
    indent = m.group(1)
    insert_at = start + k + 1
    break
if insert_at is None:
  insert_at = start + 1

snippet = (
  f"{indent}# Added by deploy script: serve Expo web at /app/\n"
  f"{indent}location = /app {{ return 301 /app/; }}\n"
  f"{indent}location = /app/index.html {{ add_header Cache-Control \"no-store\" always; }}\n"
  f"{indent}location = /app/service-worker.js {{ add_header Cache-Control \"no-store\" always; }}\n"
  f"{indent}location ^~ /app/ {{\n"
  f"{indent}  alias {app_dist};\n"
  f"{indent}  try_files $uri $uri/ /app/index.html;\n"
  f"{indent}}}\n"
)

lines.insert(insert_at, snippet)
dst = "".join(lines)

tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
  f.write(dst)
os.replace(tmp, path)
print("updated:", path)
PY

sudo nginx -t
sudo systemctl reload nginx
echo "ok: nginx reloaded"


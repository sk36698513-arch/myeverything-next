#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-myeverything.kr}"
UPSTREAM="${UPSTREAM:-http://127.0.0.1:3000}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing command: $1" >&2; exit 1; }
}

need_cmd python3

NGINX_T_OUT="$(
  if sudo -n true >/dev/null 2>&1; then
    sudo -n nginx -T 2>/dev/null || nginx -T 2>/dev/null || true
  else
    nginx -T 2>/dev/null || true
  fi
)"

if [[ -z "$NGINX_T_OUT" ]]; then
  echo "failed: nginx -T output is empty" >&2
  exit 1
fi

TARGET_FILE="$(
  NGINX_T_OUT="$NGINX_T_OUT" DOMAIN="$DOMAIN" python3 - <<'PY'
import os, re

domain = (os.environ.get("DOMAIN") or "").strip()
text = (os.environ.get("NGINX_T_OUT") or "").splitlines()

cur = None
hit = None
for line in text:
  m = re.match(r"^\s*#\s*configuration file\s+(.+?):\s*$", line)
  if m:
    cur = m.group(1).strip()
    continue
  if cur and ("server_name" in line) and domain and (domain in line):
    hit = cur
    break

if not hit and domain:
  # fallback: sites-enabled/*.conf often includes domain in path
  for line in text:
    if line.strip().startswith("# configuration file") and (domain in line):
      hit = line.split("configuration file", 1)[1].split(":", 1)[0].strip()
      break

print(hit or "")
PY
)"

if [[ -z "$TARGET_FILE" ]]; then
  echo "failed: could not locate nginx config for domain=$DOMAIN" >&2
  echo "hint: run 'sudo nginx -T | grep -n \"server_name.*$DOMAIN\"' on the server" >&2
  exit 1
fi

if ! sudo -n true >/dev/null 2>&1; then
  echo "failed: sudo (passwordless) is required to edit nginx config and reload nginx." >&2
  echo "fix: grant the deploy user NOPASSWD for nginx -t and systemctl reload nginx, and write access to $TARGET_FILE via sudo." >&2
  exit 1
fi

echo "nginx config target: $TARGET_FILE"

sudo -n python3 - <<'PY' "$TARGET_FILE" "$DOMAIN" "$UPSTREAM"
import io, os, re, sys

path = sys.argv[1]
domain = sys.argv[2]
upstream = sys.argv[3]

with open(path, "r", encoding="utf-8") as f:
  src = f.read()

if "location ^~ /sync/" in src:
  print("skip: /sync/ proxy already exists")
  raise SystemExit(0)

lines = src.splitlines(True)

def find_server_block_indices(lines, domain):
  # naive but effective parser: find a 'server {' block that contains server_name with domain
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

# find insertion point: after server_name line inside that server block
insert_at = None
indent = "  "
for k, line in enumerate(block_lines):
  m = re.match(r"^(\s*)server_name\s+.*\b" + re.escape(domain) + r"\b.*;\s*$", line)
  if m:
    indent = m.group(1)
    insert_at = start + k + 1
    break

if insert_at is None:
  # fallback: insert right after 'server {'
  insert_at = start + 1

snippet = (
  f"{indent}# Added by deploy script: proxy /sync/ to Next.js\n"
  f"{indent}location ^~ /sync/ {{\n"
  f"{indent}  proxy_pass {upstream};\n"
  f"{indent}  proxy_set_header Host $host;\n"
  f"{indent}  proxy_set_header X-Real-IP $remote_addr;\n"
  f"{indent}  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
  f"{indent}  proxy_set_header X-Forwarded-Proto $scheme;\n"
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

sudo -n nginx -t
sudo -n systemctl reload nginx

echo "ok: nginx reloaded"


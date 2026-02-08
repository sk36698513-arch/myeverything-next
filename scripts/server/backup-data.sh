#!/usr/bin/env bash
set -euo pipefail

# Simple backup for server-side file DB under ./data
# - Creates tar.gz snapshots with timestamp
# - Keeps only last N backups
#
# Usage:
#   cd /var/www/myeverything-next
#   bash scripts/server/backup-data.sh
#
# Env:
#   DATA_DIR   (default: ./data)
#   BACKUP_DIR (default: ./backups)
#   KEEP       (default: 30)

DATA_DIR="${DATA_DIR:-./data}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-30}"

if [[ ! -d "$DATA_DIR" ]]; then
  echo "skip: DATA_DIR does not exist: $DATA_DIR"
  exit 0
fi

mkdir -p "$BACKUP_DIR"

ts="$(date -u +'%Y%m%d_%H%M%S')"
commit="unknown"
if command -v git >/dev/null 2>&1; then
  commit="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
fi

name="data_${ts}_commit_${commit}.tar.gz"
out="${BACKUP_DIR%/}/$name"

echo "backup: $DATA_DIR -> $out"
tar -czf "$out" "$DATA_DIR"

# Prune old backups (best-effort)
ls -1t "${BACKUP_DIR%/}"/data_*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f

echo "ok"


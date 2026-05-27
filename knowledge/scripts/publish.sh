#!/usr/bin/env bash
set -euo pipefail

# Upload distilled wiki files to Cloudflare R2 bucket for Agent knowledge layer.
# Usage: ./publish.sh [--dry-run]
# Requires: wrangler CLI authenticated, R2 bucket "paike-knowledge" created.

BUCKET="paike-knowledge"
SRC_DIR="$(dirname "$0")/../distilled"
PREFIX="distilled"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

for file in "$SRC_DIR"/*.md; do
  [ -f "$file" ] || continue
  key="$PREFIX/$(basename "$file")"
  if $DRY_RUN; then
    echo "[dry-run] would upload: $file → r2://$BUCKET/$key"
  else
    echo "uploading: $key"
    wrangler r2 object put "$BUCKET/$key" --file "$file" --content-type "text/markdown"
  fi
done

echo "done."

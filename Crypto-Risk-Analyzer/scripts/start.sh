#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting from: $WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

export NODE_ENV=production
export PORT="${PORT:-3000}"

exec node artifacts/api-server/dist/index.cjs

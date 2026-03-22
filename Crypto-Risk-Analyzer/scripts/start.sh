#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting from: $WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

PORT=3000 node artifacts/api-server/dist/index.cjs &
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/scamsniff run serve

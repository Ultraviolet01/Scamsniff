#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

echo "Building from: $WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/scamsniff run build

echo "Build complete."

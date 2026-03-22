#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$WORKSPACE_DIR"

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building api-server..."
pnpm --filter @workspace/api-server run build

echo "Post-merge setup complete."

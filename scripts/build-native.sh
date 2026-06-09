#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Skipping native stealth module (macOS only)"
  exit 0
fi

if [[ -n "${SKIP_NATIVE_REBUILD:-}" ]] || [[ -f "$ROOT/resources/window_capture_exclude.node" ]]; then
  echo "Using committed resources/window_capture_exclude.node"
  exit 0
fi

ELECTRON_VERSION="$(node -p "require('electron/package.json').version")"
ARCH="$(uname -m)"
if [[ "$ARCH" == "arm64" ]]; then
  NODE_ARCH="arm64"
else
  NODE_ARCH="x64"
fi

mkdir -p resources

cd native
npx --yes node-gyp@10 rebuild \
  --target="$ELECTRON_VERSION" \
  --arch="$NODE_ARCH" \
  --dist-url=https://electronjs.org/headers

cp build/Release/window_capture_exclude.node "$ROOT/resources/window_capture_exclude.node"
echo "Built resources/window_capture_exclude.node"

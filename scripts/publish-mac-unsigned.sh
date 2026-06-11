#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Building unsigned macOS DMG..."
CSC_IDENTITY_AUTO_DISCOVERY=false SKIP_NOTARIZE=1 npm run build:mac

DMG="$(ls -t release/*.dmg 2>/dev/null | head -1)"
if [[ -z "$DMG" ]]; then
  echo "ERROR: No DMG found in release/"
  exit 1
fi

WEB_DMG="$ROOT/web/public/downloads/Clarifi-0.1.0-arm64.dmg"
REPO_WEB_DMG="$(cd "$ROOT/.." && pwd)/web/public/downloads/Clarifi-0.1.0-arm64.dmg"
mkdir -p "$(dirname "$WEB_DMG")" "$(dirname "$REPO_WEB_DMG")"
cp "$DMG" "$WEB_DMG"
cp "$DMG" "$REPO_WEB_DMG"

echo "Published unsigned DMG:"
echo "  $WEB_DMG"
echo "  $REPO_WEB_DMG"
echo ""
echo "Users without a signed build must clear quarantine after install:"
echo "  xattr -cr /Applications/Clarifi.app"
echo "Then right-click Clarifi → Open → Open."

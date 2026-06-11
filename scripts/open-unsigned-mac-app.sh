#!/bin/bash
set -euo pipefail

# Opens an unsigned / pre-notarization Clarifi build on macOS.
# Removes quarantine flags that cause the misleading "app is damaged" dialog.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_PATH="/Users/tschool/Desktop/Clarifi.c/.cursor/debug-6989d7.log"
DEBUG_ENDPOINT="http://127.0.0.1:7545/ingest/c19994d6-505e-4d73-855e-70ee46048b6f"

log_event() {
  local hypothesis_id="$1"
  local message="$2"
  local data="$3"
  local payload
  payload=$(printf '{"sessionId":"6989d7","runId":"open-unsigned","hypothesisId":"%s","location":"scripts/open-unsigned-mac-app.sh","message":"%s","data":%s,"timestamp":%s}' \
    "$hypothesis_id" "$message" "$data" "$(date +%s000)")
  # #region agent log
  curl -s -X POST "$DEBUG_ENDPOINT" \
    -H 'Content-Type: application/json' \
    -H 'X-Debug-Session-Id: 6989d7' \
    -d "$payload" >/dev/null 2>&1 || true
  printf '%s\n' "$payload" >> "$LOG_PATH" 2>/dev/null || true
  # #endregion
}

APP_PATH="${1:-}"

if [[ -z "$APP_PATH" ]]; then
  if [[ -d "$ROOT/release/mac-arm64/Clarifi.app" ]]; then
    APP_PATH="$ROOT/release/mac-arm64/Clarifi.app"
  elif [[ -d "/Applications/Clarifi.app" ]]; then
    APP_PATH="/Applications/Clarifi.app"
  elif [[ -d "$HOME/Applications/Clarifi.app" ]]; then
    APP_PATH="$HOME/Applications/Clarifi.app"
  else
    echo "Usage: $0 [/path/to/Clarifi.app]"
    echo ""
    echo "Could not find Clarifi.app automatically."
    echo "Drag Clarifi from the DMG into Applications, then run:"
    echo "  $0 /Applications/Clarifi.app"
    exit 1
  fi
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo "ERROR: Not found: $APP_PATH"
  exit 1
fi

echo "Clearing quarantine on: $APP_PATH"
xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true
xattr -cr "$APP_PATH" 2>/dev/null || true

QUARANTINE="$(xattr -p com.apple.quarantine "$APP_PATH" 2>/dev/null || echo none)"
SIGNATURE="$(codesign -dv --verbose=4 "$APP_PATH" 2>&1 | grep -E 'Signature=|Authority=' | tr '\n' ' ' || echo unknown)"

log_event "H5" "Cleared quarantine before open" "{\"appPath\":\"$APP_PATH\",\"quarantineAfter\":\"$QUARANTINE\",\"signature\":\"$SIGNATURE\"}"

echo "Opening Clarifi..."
echo "(If macOS still blocks it: right-click Clarifi.app → Open → Open again.)"
open "$APP_PATH"

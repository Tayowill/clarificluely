#!/bin/bash
set -e

ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  TARGET="arm64-apple-macosx13.0"
else
  TARGET="x86_64-apple-macosx13.0"
fi

mkdir -p resources

swiftc swift/AudioCapture.swift \
  -framework ScreenCaptureKit \
  -framework CoreMedia \
  -framework AVFoundation \
  -framework Foundation \
  -o resources/audio-capture-helper \
  -target "$TARGET"

echo "Compiled successfully"

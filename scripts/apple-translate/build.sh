#!/bin/sh
# Builds build/AppleTranslate.app from AppleTranslate.swift (macOS 15+, Xcode command line tools).
set -e
cd "$(dirname "$0")"
APP=build/AppleTranslate.app
mkdir -p "$APP/Contents/MacOS"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>com.amanmarwaha.ReadFluent.AppleTranslate</string>
  <key>CFBundleName</key><string>AppleTranslate</string>
  <key>CFBundleExecutable</key><string>AppleTranslate</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>15.0</string>
</dict></plist>
PLIST
swiftc -O -parse-as-library -o "$APP/Contents/MacOS/AppleTranslate" AppleTranslate.swift
codesign -s - --force "$APP" >/dev/null 2>&1 || true
echo "$APP"

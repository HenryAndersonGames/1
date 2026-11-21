#!/bin/sh
# Сборка Windows-версии: ./tools/build-win.sh  → dist/ShatteredDawn-Windows.zip
# Electron 22 — последняя версия с поддержкой Windows 7.
set -e
cd "$(dirname "$0")/.."
V=22.3.27
mkdir -p dist/cache
[ -f dist/cache/electron-$V.zip ] || curl -L -o dist/cache/electron-$V.zip https://github.com/electron/electron/releases/download/v$V/electron-v$V-win32-x64.zip
rm -rf dist/ShatteredDawn && mkdir -p dist/ShatteredDawn
unzip -q dist/cache/electron-$V.zip -d dist/ShatteredDawn
mv dist/ShatteredDawn/electron.exe dist/ShatteredDawn/ShatteredDawn.exe
rm -f dist/ShatteredDawn/resources/default_app.asar
A=dist/ShatteredDawn/resources/app
mkdir -p $A/js
cp desktop/main.js desktop/package.json index.html $A/
cp js/*.js $A/js/
(cd dist && rm -f ShatteredDawn-Windows.zip && zip -qr -9 ShatteredDawn-Windows.zip ShatteredDawn)
echo "Готово: dist/ShatteredDawn-Windows.zip"

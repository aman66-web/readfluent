#!/usr/bin/env bash
# Checks the app as it would be committed: a copy of the project without any book a writer has not
# finished (the checker still has something to say about it), then typecheck, lint, tests and a build.
#   scripts/books/verify-copy.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
npx tsx scripts/books/build-catalog.ts
DEST=/tmp/readfluent-verify
rm -rf "$DEST"; mkdir -p "$DEST"
tar --exclude=./node_modules --exclude=./.next --exclude=./.git -cf - . | tar -xf - -C "$DEST"
cp -al node_modules "$DEST/node_modules"
for slug in $(npx tsx scripts/books/list-clean.ts | awk '$1=="open"{print $2}'); do rm -rf "$DEST/lib/preview/books/$slug"; done
cd "$DEST"
npm run typecheck 2>&1 | tail -3
npx eslint . 2>&1 | tail -5
npm test 2>&1 | grep -E "Test Files|Tests |FAIL"
npm run build 2>&1 | grep -E "✓ Compiled|rror|Failed" | head -4
npm run check:native 2>&1 | tail -1

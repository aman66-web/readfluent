#!/bin/sh
# Translates the 20 featured books into each language given (default: those whose Apple pack is installed),
# checks them, then commits and pushes one language at a time, as BRIEF.md asks.
#   nohup scripts/apple-translate/run-all.sh es fr de > scripts/apple-translate/work/run-all.log 2>&1 &
cd "$(dirname "$0")/../.."
BRANCH=claude/readfluent-template-setup-ewq3lj
APP=scripts/apple-translate/build/AppleTranslate.app/Contents/MacOS/AppleTranslate
LANGS="$*"
[ -n "$LANGS" ] || LANGS="es fr de it pt hi id ja ko nl pl ru tr uk vi zh ar"
for L in $LANGS; do
  if ! "$APP" status en "$L" | grep -q installed; then
    echo "$(date +%T) $L: Apple language pack not installed, skipped"
    continue
  fi
  start=$(date +%s)
  echo "$(date +%T) $L: start"
  python3 scripts/apple-translate/translate.py "$L" > "scripts/apple-translate/work/$L.log" 2>&1
  n=$(ls lib/preview/books/*/"$L".apple.json 2>/dev/null | wc -l | tr -d ' ')
  echo "$(date +%T) $L: $n of 20 books, $(( ($(date +%s) - start) / 60 )) min"
  grep -E "FAILED|Error" "scripts/apple-translate/work/$L.log" | head -5
  [ "$n" -gt 0 ] || continue
  if npx vitest run tests/unit/book-apple.test.ts > "scripts/apple-translate/work/$L.test.log" 2>&1 \
     && npm run typecheck > /dev/null 2>&1 && npm test > "scripts/apple-translate/work/$L.npmtest.log" 2>&1; then
    git add lib/preview/books/*/"$L".apple.json
    git commit -q -m "Whole books in $L from Apple's translator

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
    git pull -q --rebase origin "$BRANCH" && git push -q origin "$BRANCH" && echo "$(date +%T) $L: pushed $(git log --oneline -1)"
  else
    echo "$(date +%T) $L: tests failed, not committed (see work/$L.test.log, work/$L.npmtest.log)"
  fi
done
echo "$(date +%T) all done"

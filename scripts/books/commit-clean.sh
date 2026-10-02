#!/usr/bin/env bash
# Commits the work in progress without any book a writer has not finished: rebuilds the catalogue, stages
# everything, leaves the open books out (and hidden from `git status` through .git/info/exclude).
#   scripts/books/commit-clean.sh "message"
set -euo pipefail
cd "$(dirname "$0")/../.."
npx tsx scripts/books/build-catalog.ts
EXC=.git/info/exclude
grep -v '^lib/preview/books/.*# open book$' "$EXC" > "$EXC.tmp" || true
mv "$EXC.tmp" "$EXC"
for slug in $(npx tsx scripts/books/list-clean.ts | awk '$1=="open"{print $2}'); do echo "lib/preview/books/$slug/ # open book" >> "$EXC"; done
git add -A
git commit -q -m "${1:-Library progress}

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013UpCko7mfGh7T36JwAfMBb" || echo "nothing to commit"
git push -u origin claude/readfluent-template-setup-ewq3lj 2>&1 | tail -1

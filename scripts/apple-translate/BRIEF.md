# Pre-translating whole books with Apple's translator, on this Mac

Goal: write `lib/preview/books/<slug>/<lang>.apple.json` for the books and languages below, using **Apple's Translation
framework on macOS** (free, on the device, no network after the language packs are downloaded). The app then serves these
books in any browser (`/api/book-full`, components/reader/useTranslated.ts) with nothing to download on the phone.

## File format (checked by tests/unit/book-apple.test.ts, run `npx vitest run tests/unit/book-apple.test.ts`)
```json
{
  "slug": "persuasion",
  "lang": "es",
  "levels": { "A1A2": ["page 1 text", "... 200 strings"], "B1B2": ["..."], "C1C2": ["..."] },
  "dict": { "orgulloso": "proud", "...": "..." }
}
```
- `levels`: take `levels.A1A2|B1B2|C1C2` (arrays of 200 English strings) from `lib/preview/books/<slug>/en.json` and translate
  **each string separately**, English -> `lang`, same order, same count. One page = one string (1 to 3 sentences). Do not join pages.
- `dict`: every distinct word of the translated text -> its meaning in English. A word is a run of letters and apostrophes,
  exactly like this regex on the text: `/[\p{L}\p{M}'’]+/gu`, lowercased (the app's tokenizer is `lib/reading/sentences.ts`).
  Translate each word alone, `lang` -> English, as a short English gloss (1 to 4 words). For `ja` and `zh` (no spaces, so a "word" is a
  whole phrase) write `"dict": {}`.
- The test fails if a card word is not in the text, a key is not lowercase, a gloss is empty, pages are still English, or counts differ.

## How
macOS 15+ only exposes `TranslationSession` inside a SwiftUI view (`.translationTask`). Make a small macOS SwiftUI app (or a
SwiftUI app that exits when done) in `scripts/apple-translate/` (commit the source, not build products), that reads a JSON job
(list of strings, from, to) and writes the translations; send big arrays in batches of 100 to 200 strings per
`session.translations(from:)` call (one `TranslationSession.Request` per string with `clientIdentifier` = index, as in
`ios/App/App/SceneDelegate.swift`). A Python driver can read en.json, call the app, and assemble the files.
Language packs: System Settings > General > Language & Region > Translation Languages (or the first run shows Apple's download sheet).
Disk is tight: download languages in the order below, and after a language is committed you may remove its pack.

## What
Languages, in this order (Apple has no Bengali or Urdu, so those two stay as they are): es fr de it pt hi, then id ja ko nl pl ru tr uk vi zh ar.
Books (20): persuasion, emma, a-study-in-scarlet, the-sign-of-the-four, the-wonderful-wizard-of-oz, the-time-machine, one-small-step-a-day, focus-without-the-noise, the-science-of-getting-rich, acres-of-diamonds, the-dhammapada, tao-te-ching, walking, eat-more-plants, the-histories, the-gallic-war, on-the-origin-of-species, the-voyage-of-the-beagle, sense-and-sensibility, the-adventures-of-sherlock-holmes.
Do the first language (es) for ONE book first, run the test, read ten pages yourself for sense (names kept, no leftover English),
then do the rest. Names of people and places must not be mangled: if the translator changes a proper name badly, leave it.

## Commit
One commit per language (all 20 books), message "Whole books in <lang> from Apple's translator", then `git pull --rebase` and
`git push origin claude/readfluent-template-setup-ewq3lj`. Run `npm run typecheck && npm test` first. Do not commit anything else.
Report back: languages done, any book where the translator failed, minutes per language.

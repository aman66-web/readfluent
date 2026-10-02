# Translating a ReadFluent book

Read `BRIEF.md` first: it says how a book is built. A book is written once, in English (`en.json`), and every other language is a translation of it, page for page. You are writing one translation of one finished book: `lib/preview/books/<slug>/<lang>.json`.

```json
{
  "slug": "the-book-id",
  "lang": "es",
  "title": "The title in the language",
  "blurb": "The jacket text in the language (same meaning as meta.blurb in en.json).",
  "levels": {
    "A1A2": [ { "text": "page 1 in the language", "keys": [ { "w": "word", "en": "word" }, { "w": "...", "en": "..." }, { "w": "...", "en": "..." } ] }, "... 50 pages" ],
    "B1B2": [ "... 50 pages" ],
    "C1C2": [ "... 50 pages" ]
  }
}
```

## Rules

- **Page n is page n of the English** at the same level. 50 pages in each level, in the same order. Nothing added, nothing dropped, nothing merged.
- **The same number of sentences as the English page** (1, 2 or 3), in the same order. A sentence ends with `.` `!` or `?` and nowhere else; an inverted opening mark (`¿` `¡`) is fine. No `...` or `…`. No abbreviations that end in a full stop (write "señor", "doctor", not "Sr." or "Dr.").
- **The same level.** A beginner page (A1–A2) uses simple, common words and short plain sentences in the language too; an intermediate page (B1–B2) is natural and fluent; an advanced page (C1–C2) is rich and literary. A learner of that level must be able to read the translation. Translate the meaning and the tone, not word by word; it must sound like a native writer.
- **Names:** keep character and place names as they are, except where the language has a well-known form (Londres, Dartmoor stays Dartmoor). Titles of people (Mr, Dr, Sir, Mrs) are translated.
- **Neutral Latin American Spanish** (for `es`): "ustedes", never "vosotros"; avoid Spain-only words (coger, ordenador, móvil, zumo, vale, vuestro, aparcar).
- **Three key pairs per page.** The three most useful vocabulary words of the page for a learner of that level. `w` is ONE word exactly as it is written in your translated text of that page (lower case, same letters and accents). `en` is ONE word exactly as it is written in the English text of that page (lower case). The two must be in the same sentence number (1st, 2nd or 3rd) of the two texts, and mean the same thing there. Never an article, pronoun, preposition or conjunction; three different words per page; do not pick a name.
- Plain text only: no markdown, no notes, no mention of pages or levels.

## Check it

```bash
npx tsx scripts/books/check-translation.ts <slug> <lang>
```

It checks the counts, the sentences, and every key pair. Fix every `FAIL` it prints, run it again, and stop when it prints `<slug> <lang>: clean`. Do not change the checker or any other file.

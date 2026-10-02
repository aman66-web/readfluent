# Making a book full length: 200 pages, twenty named chapters

Every book in the library is being brought to **200 pages** (readers found 50 far too short). You are rewriting ONE book: take the existing short version as the plan and write the full-length version.

Nothing here calls a model API. You write the file yourself and a checker verifies it.

## Read first

1. `scripts/books/BRIEF.md` — the format and every rule for a page (sentences per level, word counts, punctuation, accuracy). It is binding, with ONE change: this book has **200 beats and 200 pages in each level**, not 50.
2. `scripts/books/BRIEF-batch.md` — the rules by type (classic / original / category rules). Binding too. Where it says "50 beats" or "beat 50 / page 50" read 200.
3. Your book's current file `lib/preview/books/<slug>/en.json` (50 beats): the story or argument, the characters, the voice, the bible. Your entry in `scripts/books/LIST.json` tells you the title, type and inspiration.

## What the new `en.json` has

Same shape as BRIEF.md, plus chapter names:

```json
{
  "slug": "…",
  "meta": {
    "blurb": "KEEP EXACTLY THE CURRENT BLURB, character for character. Do not rewrite it.",
    "bible": "The current bible, kept, and extended with every new name, place and fixed fact you add.",
    "chapters": ["twenty chapter names"]
  },
  "beats": [ { "n": 1, "scene": "…", "summary": "…" }, "… 200 beats" ],
  "levels": { "A1A2": ["… 200 pages"], "B1B2": ["… 200 pages"], "C1C2": ["… 200 pages"] }
}
```

- **200 beats**, numbered 1 to 200, in order, to a real ending in beat 200 (the ending of the existing book is the ending of yours). **Page n of every level tells beat n.**
- **20 chapters of 10 beats**: beats 1–10 are chapter 1, 11–20 chapter 2, and so on. Each chapter is a unit with its own small arc or a clear step of the argument. `meta.chapters` has exactly 20 names, one per chapter, in order.
- **Chapter names** are titles a reader wants to tap: 2 to 6 words, specific and intriguing (for fiction an image, an event or a question from that chapter; for non-fiction the idea or the surprise). No "Chapter", no numbers, no ending punctuation, no two alike, no spoiling the ending. They are English; the rest of the app shows them as they are.
- **Four times the room**: do not stretch or repeat. Tell the story with more scenes, more incident, more of the characters' lives and the world, more of the argument's steps and examples. Every beat must move the story or argument on, or add a new concrete thing; never write two beats that say the same thing in different words. For a retold classic follow the original's real events in order, in much more detail than the 50-beat version, and use more of its well-known episodes. For an original, invent new scenes and subplots that fit the premise, the characters and the ending already in the short version, keeping the originality rules. History and science: more steps, more examples, still only true facts, "about" for approximate numbers.
- **Health books**: beat 200 and page 200 of every level must say plainly that the book is general information and not medical advice (use the words "not medical advice"); `meta.bible` keeps its line "This book is general information and is not medical advice."
- The three levels stay in step: the same moment on the same page number.
- Every page rule of BRIEF.md still holds, including: A1–A2 = exactly one sentence of 8–14 words in very simple English; B1–B2 = exactly two sentences; C1–C2 = exactly three sentences with rich vocabulary; no page repeats another in its level; no `...`, no "Mr." with a full stop, no markup, no decimals or initials with full stops that would be read as sentence ends.

## How to work (this is a big file: build it in pieces)

1. Work only in your own folder `/tmp/claude-0/work-<slug>/` (create it). Never put drafts in the book's folder.
2. Plan first: write the 20 chapter names and, for each chapter, the ten beats (scene caption of at most 14 words, one-sentence summary). Save the plan as a file.
3. Write the pages chapter by chapter: for each chapter write the ten A1–A2 pages, the ten B1–B2 pages and the ten C1–C2 pages. A python script that holds the lists and assembles the final JSON (`json.dump(..., ensure_ascii=False, indent=1)`) is the easiest way to keep this manageable and to patch single pages later.
4. Check the assembled file in your work folder:

```bash
npx tsx scripts/books/check-en.ts <slug> --path /tmp/claude-0/work-<slug>/en.json
```

Fix every `FAIL` and `FLAG` by rewording the page (never by editing the checker). Repeat until it prints `<slug>: clean`.

5. ONLY when it is clean, copy it into the library in one step: `cp /tmp/claude-0/work-<slug>/en.json lib/preview/books/<slug>/en.json`, then run `npx tsx scripts/books/check-en.ts <slug>` (without `--path`) and confirm `<slug>: clean`. Do not touch `cover.json`, other books, any other file, git or the app code.

## Report

In two or three lines: the slug, that it is clean, and anything the owner should fact-check (for classics or history/science written partly from memory).

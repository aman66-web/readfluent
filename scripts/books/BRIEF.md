# Writing a book for ReadFluent by hand

A book is written once, in English. That English text is the default: every other language is a translation of it, page for page (`es.json` next to `en.json`), so a reader who learns Spanish, French or Japanese reads the same book. Nothing in this folder calls a model; the books are written by a person (or by Claude, working as the writer) and checked by `check-en.ts`.

## What you write

One file: `lib/preview/books/<slug>/en.json`

```json
{
  "slug": "the-book-id",
  "meta": {
    "blurb": "Two or three sentences for the jacket, 45 words at most. Say what the book is and make someone want to open it.",
    "bible": "Every name, place and fixed fact of the book, one short line each. Every capitalised word in here counts as a name and is never flagged as a hard word. Also the voice and the tone."
  },
  "beats": [
    { "n": 1, "scene": "A short picture caption, 14 words or fewer", "summary": "One sentence: what happens in this beat." }
  ],
  "levels": {
    "A1A2": ["page 1", "page 2", "... 50 strings"],
    "B1B2": ["... 50 strings"],
    "C1C2": ["... 50 strings"]
  }
}
```

- **50 beats.** A beat is one step of the story or the argument. They run in order from the opening to a real ending. Spread the whole book across them: nothing important is skipped and the ending is not rushed.
- **Page n of every level tells beat n.** The three levels are the same book at three difficulties, so page 17 of A1–A2, B1–B2 and C1–C2 all tell the same moment. Never let the levels drift apart.
- **`scene`** says what a picture of that page would show: "Alice follows a white rabbit down a rabbit hole". It is used as the photo caption now and as the brief for the picture later. Concrete things that can be seen. Never write the word "image", "picture", "photo" or "illustration" in it.

## The rules for a page

Every page is complete on its own, in plain prose. No markdown, no asterisks, no notes to the reader, no mention of pages, beats or levels, no pictures.

- **A1–A2 (beginner): exactly ONE sentence, 8 to 14 words.** Simple present and simple past (and "going to"), the most common everyday words, concrete vocabulary, no idioms, no passive voice, no relative clauses. Proper names are fine. A beginner must understand every word without a dictionary. Few rare words (the checker allows none).
- **B1–B2 (intermediate): exactly TWO sentences, 12 to 22 words each.** A wider range of tenses (present perfect, past perfect, conditionals, the passive now and then) and connectors (although, because, however, as soon as, instead). Everyday vocabulary plus topic words (the checker allows two uncommon words per page). Natural, fluent prose; an occasional common idiom is fine.
- **C1–C2 (advanced): exactly THREE sentences, 18 to 35 words each.** Rich, precise, nuanced vocabulary, subordinate clauses, abstract nouns, figurative language, varied sentence rhythm. It should read like good prose, close to the original's register. Do not make it plain: the checker flags vocabulary that is too plain.

Sentences and punctuation (the app counts sentences by machine and lines each sentence up with its translation, so this matters):

- A sentence ends with one of `.` `!` `?` and nowhere else. Direct speech is fine inside a sentence (She said, “No, thank you.”). Never put `.` `!` or `?` inside a quotation unless the quotation also ends the sentence.
- Write titles without a full stop: Mr Darcy, Mrs Hudson, Dr Mortimer. Never use `...` or `…`. Never use an abbreviation that ends in a full stop (no “etc.”, “e.g.”, “St.”).
- Write numbers under ten in words. Use curly quotes “ ” for speech and the plain apostrophe ' in words like don't.
- No page may repeat another.
- Dark subjects (death, crime) are treated factually and without gore. Keep everything suitable for a general audience.

## Accuracy and originality

- Retell in your own words. A classic that is in the public domain may follow the original closely, but never paste long passages from it; at C1–C2 you may echo its register.
- A non-fiction or "inspired by" book is original writing. It does not copy the book that inspired it: not its anecdotes, not its examples, not its chapter order. It teaches the same subject in its own way.
- History and science must be accurate. Do not invent facts, dates, quotes, statistics or studies. Use "about" for approximate numbers. Where something is uncertain or disputed, say so in the text.
- Health: factual and cautious, never a diagnosis. Religion and philosophy: respectful and neutral, correctly attributed.

## Check it

```bash
npx tsx scripts/books/check-en.ts <slug>
```

It checks the counts, the sentence number of every page, repeats, markup and readability against the level (sentence length, word rarity, Flesch–Kincaid grade). Fix every `FAIL` and every `FLAG` it prints, run it again, and stop when it prints `<slug>: clean`. A flag is almost always fixed by rewording the page, not by arguing with the checker; do not weaken the rules or edit the checker.

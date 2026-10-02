# Writing a batch of books (the 270-book library)

You are the writer. Nothing here calls a model API; you write the files yourself and a checker verifies them.

Read first, in this order:
1. `scripts/books/BRIEF.md` — the format and every rule for a page (sentences per level, word counts, punctuation, accuracy). It is binding.
2. One finished example so you can match tone and format: `lib/preview/books/the-hound-of-the-baskervilles/en.json` (a retold classic) and `lib/preview/books/trees-talk-to-each-other/en.json` (an original non-fiction book). Read the first 12 beats and the first 6 pages of each level; do not read all of it.
3. Your books' entries in `scripts/books/LIST.json` (find them by `slug`): title, category, type, author or inspiredBy.

## For each of your books you write TWO files

1. `lib/preview/books/<slug>/en.json` exactly as BRIEF.md describes: `slug`, `meta.blurb` (45 words at most, written to make someone want to open it), `meta.bible` (every name, place and fixed fact, one short line each, plus the voice and tone), 50 `beats`, and `levels` A1A2 / B1B2 / C1C2 each with exactly 50 pages. Page n of every level tells beat n.
2. `lib/preview/books/<slug>/cover.json`:
```json
{ "bg": "#0B3B4A", "light": false, "art": ["heart", "sparkles"] }
```
   - `bg`: the cover's colour, one of these (no orange, no red): dark `#0B3B4A #1B2250 #0E7490 #123D2F #1C1C1F #2A1B5A #0A1428 #164E63 #3B1D4A #26262A #0F3B38 #14407A`; light (set `"light": true`) `#22D3EE #E3F8FC #F3EDE3 #DDF3E4 #D4F4FA`. Vary the colours between your books; pick what suits the book's mood.
   - `art`: one or two picture ids that suit the book, from: `book lens cup steam globe orbit turtle lamp hourglass moon compass needle whale waves frame stack pawn leaf bolt stars heart key house crown mountain rocket tree flame sun feather shield anchor scroll brain dumbbell apple coin chart castle sword ring envelope dove lotus dna telescope pyramid ship train footprints candle mask lighthouse question handshake bridge`. The first is the main picture (it is drawn big in the middle); a second is optional. Prefer a picture that is not the first thing every book of the category would use.

## What kind of book each one is (the `type` in LIST.json)

- `classic`: a work in the public domain. Keep its real title (the `title` given). Retell it in your own words, following the original closely in events and order; never paste long passages. It is a retelling for learners, so give it a real beginning, middle and end across the 50 beats. For a long or non-narrative work (a treatise, a collection of sayings or stories, scripture, a diary), spread its best-known parts across the 50 beats in a sensible order and say clearly which part each beat is from; keep it accurate and respectful.
- `original` (the entry names `inspiredBy`): fiction → write a COMPLETELY NEW story: new characters, names, setting and plot. Keep only the genre and the feel of the inspiration. Non-fiction → explain the subject in your own words with your own examples and metaphors; no branded terms, signature stories, anecdotes or copied text from the inspiration; do not name the inspiration in the text. Every fact must be true.
- Whatever the type: suitable for a general audience of learners; dark subjects factual and without gore; no real living people.

## Category rules

- romance, crime, fantasy-scifi: story with a clear arc and a real ending in beat 50. Crime: fair-play puzzle, no gore.
- self-help, business-money: practical, concrete, kind. Each beat teaches one clear idea or shows one step; build to a final takeaway.
- religion-spirituality: respectful and neutral, correctly attributed to its tradition; never preach or compare traditions unkindly.
- history: accurate. Do not invent dates, quotes, numbers or events. Use "about" for approximate figures and say so where something is disputed.
- science: accurate and simple; do not invent studies or numbers; where it is uncertain, say so.
- health: factual and cautious; general information only, no diagnosis, no personal treatment advice, say when evidence is uncertain. **Beat 50 and page 50 of every level must say plainly that the book is general information and not medical advice (use the words "not medical advice"), and `meta.bible` must contain the line "This book is general information and is not medical advice."** (Beat 50 is still a closing beat of the book.)

## Check, and do not stop until it is clean

```bash
npx tsx scripts/books/check-en.ts <slug>
```
Fix every `FAIL` and every `FLAG` by rewording the pages (never by arguing with the checker; never edit the checker or any file but your own books'). Run it again; stop only when it prints `<slug>: clean`. Tips: write the whole en.json in one go with the Write tool, then fix flagged pages with small targeted edits (a short python script doing string replacements on the JSON is fastest). A1–A2 pages must be ONE sentence of 8–14 words using only very common words; B1–B2 TWO sentences; C1–C2 THREE sentences, rich vocabulary (the checker flags prose that is too plain at C).

## Report

When finished, reply in a few lines: which slugs are clean, and any that are not and why. Do not touch other books, other files, git, or the app code.

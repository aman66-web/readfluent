# The book pipeline

Writes the full text of the 200 books in `catalogue.json`, checks every rule in the owner's brief, and saves JSON the app can load. It talks to the Anthropic API from this folder only: the app itself never calls a model (CLAUDE.md).

## What it makes

Per book, nine versions: levels **A** (A1–A2), **B** (B1–B2), **C** (C1–C2) × lengths **50, 100, 200** pages. English is the source text; every page also has Spanish (neutral Latin American) and three key word pairs.

```
content/<niche>/<book-id>/meta.json     id, niche, title, title_es, blurb {en, es}, type, credit, disclaimers, status
content/<niche>/<book-id>/beats.json    the 50 beats and the book's "bible" (names, facts, tone)
content/<niche>/<book-id>/<A|B|C>_<50|100|200>.json   { book, level, length, pages: [Page] }
dictionary/es.json                      one word card per Spanish key word, shared by every book
review/<A|B|C>.json                     50 pages per level for a native speaker to read
reports/validation.json                 the result of every check, per book
reports/cost.json                       tokens and dollars, by step and by book
reports/pilot.md                        sample pages, validation, cost, projection
```

```jsonc
// Page
{ "n": 5, "beat": 4, "en": "…", "es": "…", "keys": [{ "es": "oyó", "en": "heard" }, …] }
// dictionary/es.json, keyed by the lowercase Spanish word as it appears in the text
{ "oyó": { "ph": "oh-YOH", "pos": "verb · past", "mean": "heard — said of hearing", "root": "oír — to hear" } }
```

`mean` is the English meaning, then ` — `, then one short line on when the word is used. The word card in the app shows the part before the dash large and the part after as its one line.

There are no images and no image fields. Every page keeps its `beat`, so photos can be attached to beats or pages later.

## How a book is built

1. **Beat sheet.** One request writes 50 beats, the bible, the Spanish title and the blurbs. A classic must say whether it is certainly in the public domain; if not, the book **stops** and is flagged for a person. An original's beat sheet is then compared with the work that inspired it by a second request, and rewritten (up to 3 times) if it is too close.
2. **Pages.** Every beat is written once per level as five pages: `p50` (the whole beat on one page), `c1` and `c2` (two pages that tell it), `x1` and `x2` (two detail pages). That gives
   - **50 pages** = `p50` of every beat,
   - **100 pages** = `c1 c2` of every beat,
   - **200 pages** = `c1 x1 c2 x2` of every beat, so it holds every page of the 100.
   Five beats are written per request (25 pages), so a book is 30 requests, all independent: they can run in parallel or as one batch.
3. **Checks.** Every page is checked (below). A page that fails is rewritten, with the problems named, up to 3 times. Pages still failing are listed in the report.
4. **Word cards.** Every Spanish key word without a card gets one, 60 at a time, across all books at once.
5. **Originals, again.** An editor request reads the finished C1–C2 text against the inspiration; the beats it names are rewritten at every level, and it reads again (up to 3 times).
6. **Assemble.** The nine files are written. A **health** book's last page, at every level and length, is replaced by a fixed "not medical advice" notice (written by hand in `assemble.ts`, not by a model), and `meta.json` says `"disclaimers": ["not_medical_advice"]`.

## What is checked

A book is **pass** only when all of these hold. `reports/validation.json` has the detail.

- exactly 50, 100 and 200 pages; the 200 contains every page of the 100, in order; beats in order, with 1, 2 and 4 pages each; no empty or repeated page; no markdown, tags or leftover instructions
- 1, 2 or 3 sentences per page for A, B and C, and the Spanish has the same number as the English
- 3 key pairs per page: the Spanish word is a single word of the Spanish text, the English word a single word of the English text, in the same sentence; not an article or pronoun; no repeats
- every Spanish key word has a card with `ph`, `pos`, `mean`, `root`; no Spain-style respelling ("th")
- no Spain-only Spanish (vosotros, coger, ordenador…)
- **CEFR and readability flags** (soft): sentence length against the guide (A 8–14, B 12–22, C 18–35 words, with a little room), words too rare for A and B, too plain for C, and a Flesch–Kincaid grade. These are a *proxy*: there is no free CEFR word list, so word difficulty is the Zipf frequency in `data/en-zipf.json` (wordfreq). Flagged pages are rewritten up to 3 times; a book whose last flags cannot be cleared is **flags**, not **pass**, and a person looks.
- originals: the editor requests above found nothing too close to the source, or the book is flagged

Results: `pass`, `flags` (only CEFR flags or an originality note left), `fail` (a hard rule broken), `halted` (public-domain doubt, or no valid answer after 3 tries), `incomplete`.

## Running it

```bash
export ANTHROPIC_API_KEY=sk-ant-…                 # console.anthropic.com → API keys
npx tsx scripts/pipeline/run.ts --pilot           # the 3 pilot books, default budget $25
npx tsx scripts/pipeline/run.ts --books pride-and-prejudice --budget 10
npx tsx scripts/pipeline/run.ts --all --mode batch --budget 600   # only after the owner approves the cost
```

- **Model** `claude-opus-5-5` ($4 / $20 per million tokens in / out; cache reads $0.20). Change `MODEL` and `PRICES` in `config.ts`. Thinking is on by default for this model and billed as output; `EFFORT` sets how much.
- **Budget.** `--budget` is a hard stop: before each step the run estimates what the step will cost from what the same step has cost so far, and stops (exit code 2) rather than pass it. `reports/cost.json` keeps the running total across runs.
- **Resume.** Every piece is a file under `.pipeline-work/<book>/`. A piece that exists is skipped, so run the same command again after a stop, a crash or a budget stop. In batch mode the batch id is kept on disk and the same batch is picked up again.
- **Batch.** `--mode batch` uses the Message Batches API: half the price, results in up to a day. Use it for the bulk run. `--mode sync` (default) is for the pilot and for fixes; it streams, runs 4 requests at a time (`--concurrency`), and enables the API's refusal fallback.
- **No API yet.** `--mode files` writes each request to `.pipeline-work/_files/requests/` and reads the answer from `.pipeline-work/_files/answers/`, so the prompts and checks can be tried on model output written another way. Costs there are estimates from sizes.
- `--stage beats|pages|fix|dictionary|originality|finalize` runs one step. `--plan` prints the size of the run and sends nothing. `PIPELINE_CHUNKS=1` writes only the first five beats of each level (for trying prompts cheaply; never for a real run).

## How the app should load it

Content is data served from storage, never compiled in (CLAUDE.md). Upload `content/` and `dictionary/es.json` to object storage, load a version with one request for `content/<niche>/<book-id>/<level>_<length>.json`, and a book's cards from `dictionary/es.json` (or a slice of it per book). Load only books whose `meta.json` has `"status": "pass"`. Show `meta.credit` on the jacket, and `meta.disclaimers` where present.

The `ph` respellings are Latin American. Spanish key words are keyed lower case exactly as they appear in the text, so a tap on any word is a plain lookup.

## Rebuilding the word-frequency list

`pip install wordfreq && python3 scripts/pipeline/data/build-zipf.py`. Tests: `npx vitest run tests/unit/pipeline.test.ts` (a pretend model; no network).

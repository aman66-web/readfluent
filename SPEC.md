# ReadFluent — SPEC

*Last updated 2026-10-01. Source of truth for what the product is. Build order lives in CLAUDE.md; ambiguous calls live in DECISIONS.md.*

**One line:** a mobile reading app where people learn a language by reading real books, retold at their level and at the length they choose.

**Tagline:** Real books. Your level.

## Who it's for

Language learners who find lesson-style apps boring. They want real stories and ideas (Pride and Prejudice, a habits book) without getting lost in language that's too hard.

## Core flow

1. Open the library, pick a book.
2. Tap **Read**.
3. Pick a level: **A1–A2** (beginner), **B1–B2** (intermediate), **C1–C2** (advanced).
4. Pick a length: **50 pages** (fast), **100** (medium), **200** (long).
5. Read page by page, swipe-through.

Every book exists in **9 versions** (3 levels × 3 lengths).

## Reading screen

- A photo on every page (self-produced).
- 28–35 words of text under the photo — a page takes seconds.
- Page number and a progress bar.
- Mobile-first, designed at 375px.

## Learning tools

The differentiator, carried over from the Hindi prototype.

| Tool | Behaviour |
| --- | --- |
| Word card | Tap any word → root word, form, pronunciation, meaning. |
| Colour-matched words | Matching words in the two languages share a colour. Needs a second language, so it waits for translation (see DECISIONS.md). |
| Line audio | Audio for each line, plus "say it again, slowly". |
| Flashcards | Built from the words the reader met. |

Everything is in English for now; translation comes later.

## Library

- **9 categories:** romance; crime; fantasy and sci-fi; self-help; business and money; religion and spirituality; health; history; science.
- **30 books each, 270 total.**
- **Classics** (public domain) keep their real titles, e.g. Pride and Prejudice.
- **Modern ideas** get original titles and original text, with an "inspired by" credit.

## Content rules

- Every text is checked against its CEFR band before it ships.
- "Inspired by" books are genuinely new writing, never close retellings.
- Health books carry a "not medical advice" line.
- Nothing from Mental Stint ships: no content, no credentials, no identity.

## Scale (the numbers that shape the build)

| Unit | Count |
| --- | --- |
| Books | 270 |
| Versions (books × 9) | 2,430 |
| Pages per book (3 levels × (50 + 100 + 200)) | 1,050 |
| Pages in the library | 283,500 |
| Words of text at ~31 words/page | ~8.8M |

Each page needs a photo and line audio (plus slow audio). Photos can be shared across levels of the same length, and the 50- and 100-page versions may reuse photos from the 200-page set; that brings the photo count down to roughly 54,000 at best. Even so, this is a pipeline problem, not a hand-production one. See Risks.

## Still to decide

Each has a working default in DECISIONS.md so the build isn't blocked.

- **Pricing** — e.g. free 50-page samples with a paid upgrade.
- **Accounts** — whether readers need one, and how progress syncs.
- **Offline reading** — explicit download only, as in the template (nothing persists unless the user downloads it).
- **First translation languages.**
- **Launch phones** — iOS, Android, or both first.

## Risks

- **Level accuracy.** Run every text through a CEFR checker.
- **Inspired-by originality.** Must be new writing, never a close retelling.
- **Health content.** Needs the "not medical advice" line.
- **Production load.** 2,430 versions is only realistic with a script that automates writing and checks. Photos and audio are the larger bottleneck: ~283,500 pages, each needing both.
- **Photo licensing.** "Self-produced" at tens of thousands of images needs a stated plan (shoot, generate, or mix); see DECISIONS.md.
- **Classics edition.** Only public-domain texts keep their real titles; each classic needs a copyright check in every market we launch in.

## Out of scope for v1

Translation UI, a second UI language, social features, in-app authoring, and anything from Mental Stint's content or identity.

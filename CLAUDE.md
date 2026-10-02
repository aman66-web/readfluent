Read SPEC.md before doing anything. It is the source of truth.
Build strictly milestone by milestone (SPEC.md §10). Do not start the next milestone until the current one's "Done when" criteria pass.
Run `npm run typecheck && npm test` before every commit. Commit after each milestone with a message like "M1: content contract".
If the spec is ambiguous, choose the simplest option, implement it, and log the choice in DECISIONS.md (one line each).
Keep the UI mobile-first (375px wide first, then desktop).
This is not the Next.js you know: read `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).

## Decided — do not re-derive these

The product (1 Oct 2026): ReadFluent is real books, retold at a level (A1–A2, B1–B2,
C1–C2) and a length (50, 100, 200 pages), read one page at a time: a photo and 1–3 sentences
(A, B, C). 9 categories, 200 books (`scripts/pipeline/catalogue.json`), 9 versions each, 1,800 versions. SPEC.md
has the rest. It is English-only until translation; colour-matched words wait for it.

The template (1 Oct 2026): the engineering underneath came from Mental Stint's `revise/`
(`aman66-web/span`, commit `8a7f13c`). The product did not. Nothing of Mental Stint's
content, credentials or identity ships: grep for `mental ?stint`, `mentalstint`,
`mental_stint`, `lumen`, `revise.` before every milestone commit. SPEC.md §8 lists what is
kept and what is replaced; follow it, do not re-audit it.

The app makes no calls to any AI model at read time (carried over from Mental Stint,
29 Sep 2026). A model is used only by offline scripts in `scripts/pipeline/`. Do not add
a runtime LLM call without the owner asking for one by name. The owner has asked for one by name: a Talk option in Recall (1 Oct 2026), a conversation in the language being learned. It is the only one allowed, and it is built (2 Oct 2026): `/recall/talk` → `app/api/talk/route.ts`, signed-in readers only, 40 messages a day (`talk_take`, migration 0005), key `ANTHROPIC_API_KEY` server-side only, model `TALK_MODEL` (default claude-sonnet-5-5). Without the key it says it is not switched on.

Content is data, not code (1 Oct 2026). Versions are JSON served from storage; photos and
audio sit in object storage behind a CDN. Never put a book, a photo or a clip in `public/`
or compile one into the bundle. Mental Stint did, and shipped 239 MB of audio into every
native build for months. `.capacitorignore` and the stub `webDir` stay; if
`scripts/check-native-bundle.mjs` fails, fix the cause, do not raise the limit.

A page is 1, 2 or 3 sentences (A, B, C; owner, 1 Oct 2026, replacing 28–35 words), a version's page count is exactly its length, and a version
publishes only when every gate passes. These are enforced by the pipeline's checks (`scripts/pipeline/validate.ts`) and by `scripts/validate-content.ts` when it exists,
not by hand. A health book without its "not medical advice" line fails validation.

Pictures and phone storage (owner, 1 Oct 2026): each book has one pool of 200 generated
photos, shared by all nine versions; 200-page uses all, 100-page every 2nd, 50-page every
4th. The app installs as a thin shell (under 2 MB); nothing is stored on the phone until
the reader downloads. Photos are kept once per book, audio is optional in a download.

Offline (1 Oct 2026): nothing persists unless the reader explicitly downloads it. One
cache bucket per downloaded version (text, audio) plus one per book (its photos); the app shell is cached once. Reading online
writes nothing to the app's own storage (Cache Storage); the browser's ordinary HTTP cache is separate and the OS may evict it.

Accounts and money (1 Oct 2026, working defaults, owner to confirm): reading needs no
account (anonymous-first, as in the template's `proxy.ts`); signing in is for buying and
sync. Free is the 50-page samples; 100 and 200 are paid. A version someone has started
stays open. Prices and rules live in `lib/plan.ts` and nowhere else. The server alone
writes `users.plan`; never grant a client the right to.

Brand (owner, 1 Oct 2026): the colour is cyan, not orange. `BRAND` in `lib/brand.ts` is the one source (bright #22D3EE on dark, deep #0E7490 on paper); `--accent` in `app/globals.css` mirrors it. A test fails if the old orange returns. Use the tokens, never a hex.

Credentials: nothing is copied from Mental Stint. Own Supabase, Vercel, RevenueCat and
store keystores. `.env*`, keystores and `.p8`/`.p12` files are never committed.

## Build log

One line per milestone when it is done: date, what shipped, anything the next person must know.

- M0 Seed and strip — done 1 Oct 2026. Template copied from `span/revise@8a7f13c` (keep-set only, 1.05 MB tracked), identity renamed everywhere, `lib/brand.ts` is the one source for name/scheme/bundle id/storage prefix, three new migrations proved on real PostgreSQL 16, shell-only service worker verified in a browser, `.capacitorignore` + stub `webDir` + `check:native`, guard test for the old identity. Next 16.3.8 (critical advisory fixed). **Not done, by design:** `cap sync` on a Mac (first step of M11); sync, SRS, narration, offline downloads and the sign-in form are adapted in M6–M9 from the pinned commit. Placeholders to replace before M11: `PRODUCTION_URL`, Google client ids, Apple team id, icons, `PRICE`.
- P Preview slice — done 1 Oct 2026 (temporary, owner's request). Library, jacket, level and length picker, and the reader for one sample book (`lib/preview/`, deleted when M1 lands). Verified in a browser at 375×667, 360×640 and 390×844: every page fits, swipe/resume/end work, 5 photos mounted at most. Deploy steps and the setup prompt are in DEPLOY.md.
- O First screen (onboarding) — done 1 Oct 2026, owner's request, reworked the same day after seeing it on a phone. `/welcome`: a wall of 15 portrait book covers (title and author on top, icon below, `components/welcome/art.tsx`), the name in cyan lamps, a cyan button. Brand colour is now cyan app-wide. New visitors are redirected to it from `/` by `proxy.ts` (cookie `rf_onboarded`). Verified at 393×852, 393×695, 375×560 and 360×640: every title fits, no overflow, button on screen, reduced motion holds still, opens offline. Only the first screen of the original's longer flow; the rest is not started.
- O2 Full onboarding — done 1 Oct 2026, owner's request. All 18 screens, the second asking which language you speak and which you want to learn (`lib/onboarding/steps.ts`), white ground, cyan, ReadFluent's own words; preview any screen at `/welcome?step=<id>`. Walked through in a browser (answers persist, Back works, cookie set at the end). Supabase: `supabase/setup.sql` + `SUPABASE.md` (Chrome prompt); **not yet run — needs the owner's login**. Until it is, the sign-in step shows a no-database card. Copy, art and the guide are placeholders the owner will edit.
- O3 Interface in 20 languages — done 1 Oct 2026, owner's request. The language they speak changes the whole app as it is chosen; `/languages` changes it later. Translations are first drafts, **not yet reviewed by native speakers**. Add any new interface text to `lib/i18n/en.ts` first, then to every `messages/<code>.ts`. Books stay English until translation.
- O4 Dashboard, level and XP — done 1 Oct 2026, owner's request. Sign-up asks how much of the language they know (or an adaptive 5-minute test, English only for now); the home screen opens on a level card (A1–C2, XP bar to the next level), the reading graph in cyan, and the library. XP rules and thresholds are working defaults in `lib/xp/levels.ts`. Not built: the in-app tour, XP from word taps/flashcards (M5/M7), a placement bank for languages other than English, syncing XP (M8).
- O5 Why, level explainer, time and path — done 1 Oct 2026, owner's requests. The first run is 18 steps: why they are learning, the A1–C2 (CEFR) explainer with Option 1 / Option 2, minutes a day, and how long each level takes at that pace. The XP ladder is now hours of reading (`lib/xp/levels.ts`), so the estimate is honest. **Translations are first drafts, unreviewed by native speakers.**
- O6 Dewey welcomes, then says how quick it is — done 1 Oct 2026, owner's request. Then `go`: Dewey celebrates and the run moves on by itself (Back skips it). Then `months`: what 3 months adds up to. Recall lists Flashcards and Talk (soon). Dewey beside every question reacts to taps. Then `home`: Dewey asks to be added to the home screen (install prompt / iPhone how-to; a real widget waits for M11). After "Get started": Dewey waves (`hello`), then Dewey says "Just N quick questions" (`quick`, N from `QUESTION_STEPS` in `lib/onboarding/steps.ts`). Translations are first drafts.
- R Recall — done 2 Oct 2026, owner's request: `/recall` is a hub (your cards due, Top 50 / Top 100 phrase decks for the language being learned, Talk with Dewey). Flashcards (`/recall/flashcards`, SM-2-like, `lib/srs/`), 20 hand-written 100-phrase decks (`lib/decks/data/`, native review pending), Talk (needs `ANTHROPIC_API_KEY` and Supabase 0005). Also: home Today's targets, library captions, friends and league (`/friends`, migration 0004; needs Supabase set up).
- R2 Premium, achievements, listen-aloud — done 2 Oct 2026, owner's requests: subscription sheet (`components/paywall/`, `/paywall`, lock on longer lengths in ReadPicker, Profile Premium row; prices from `lib/plan.ts`, store prices on the phone; **gates stay open until `PAYMENTS_LIVE` and RevenueCat are set up**), 10 achievements (`lib/badges.ts`, kept once earned, banner on home, grid on Profile), a Listen button in the reader (phone voice), C2 shows progress to its end. The tour's "enjoy reading" screen and "Building your library" now use the real covers. Dewey cheers during onboarding. Translations are first drafts.
- R3 Book text in every language, library shelf and book page redesign — done 2 Oct 2026, owner's requests: titles, descriptions and the path's chapter lines are translated for the 5 books in all 20 languages (see DECISIONS.md for how to add a book); new shelf and book page. `LAUNCH.md` lists everything left before real readers.
- R4 270-book library, guided tour, polish — done 2 Oct 2026, owner's requests: 270 books, 30 in each of the nine categories (5 hand-built, 265 written by writer agents from `scripts/books/LIST.json`; rules in `scripts/books/BRIEF-batch.md`, checker `scripts/books/check-en.ts`, catalogue built by `scripts/books/build-catalog.ts`). Classics are retold from public-domain texts; books 'inspired by' a living author's book are new stories with a new title and an 'Inspired by' line. Dewey's guided tour (`components/tour/`: locks page scrolling while it runs, keeps the lit part clear of the bubble), a more distinctive look (display titles, ring tiles, Recall hub, fan of covers), Dewey's wings redrawn, and after 'Add me to your home screen' Continue opens a three-step how-to (iPhone / Android). **Not done:** only 50-page editions; titles, descriptions and chapter lines of the 265 new books are English only (no translations yet); a few classics were written from memory of the novel and need a fact-check (the writers flagged: Moreau, First Men in the Moon, Sleeper Awakes, Lady of the Camellias, Valley of Fear, How to Live on 24 Hours a Day, Letters from a Stoic).
- R5 Tour, 200-page library, Recall tests — done 2 Oct 2026, owner's requests: guided tour rebuilt (one lit cover with a tapping hand, swipe demo, paragraph spotlight, centred hello and goodbye; `components/tour/Coach.tsx`); Recall hub with Flashcards, Tests (A1–C2, five kinds, `lib/tests/`) and Speaking, XP rules for both (`lib/xp/`); every book is now one length (no picker) with 20 named chapters; blurbs rewritten for all 270. **200-page rewrite: 144 of 270 books are full-length (200 pages in each level), the other 126 are still 50 pages and show as such; the owner stopped the rewrite on 2 Oct 2026 to save usage.** Resume with `python3 scripts/books/queue-200.py next` and `scripts/books/BRIEF-200.md`; commit with `scripts/books/commit-clean.sh`. Writers flagged facts written from memory: the checklist is in DECISIONS.md (search "fact-check") and needs a human pass before launch. Spanish for the full-length books is not translated yet.
- R6 Machine translation and level exams — done 2 Oct 2026, owner's requests: books open in the language being learned through Google Cloud Translation (`lib/translate/`, `app/api/translate`, key `GOOGLE_TRANSLATE_API_KEY`, one translation per version kept by the CDN; **off until the key is set in Vercel: the reader then says the book is not in that language yet**); level exams gate each level above A1 (40 questions, 30 minutes, 75% to pass; `lib/xp/exam.ts`, `components/tests/ExamRunner.tsx`); `SETUP-PROMPT.md` has the Claude-in-Chrome prompts for Supabase, Google and Apple sign-in and the translator key.
- M1 Content contract — not started
- M2 Prove the content pipeline — in progress, 1 Oct 2026, owner's brief: `scripts/pipeline/` is built and tested with a pretend model (see its README); the prompts and checks were tried on real model output for the 3 pilot books (rehearsal, first 5 beats). **The real API pilot has not run: it needs `ANTHROPIC_API_KEY`.** The other 197 books wait for the owner to approve the cost. Generated books are not committed (`content/`, `dictionary/`, `reports/`, `review/` are gitignored); they go to object storage.
- M3 Library and the pick flow — not started
- M4 The reader — not started
- M5 Word cards — started 1 Oct 2026 at the owner's request (reader follows the owner's template: tap a word, translation line on top, word card at the bottom, Listen/Slowly/Save). Demo data only (five Spanish pages, `lib/preview/spanish.ts`); the translation pipeline and real dictionaries are M2/M5.
- Audit pass — 1 Oct 2026, overnight, owner's request. Four review agents (reader, onboarding, shell/security, languages/accessibility) and fixes: XP integrity (storage fallback, finish needs 80% of pages), reader keyboard/focus/RTL/voice, safe-area padding now adds to each screen's own, dialogs share `components/Modal.tsx`, proxy signs in only page loads and keeps the first-screen cookie alive, security headers, device-only delete never touches the account, contrast and tap targets. Still open: native review of translations, the real API pilot, Supabase setup.
- M6 Line audio — not started
- M7 Flashcards — not started
- M8 Accounts and sync — not started
- M9 Offline downloads — not started
- M10 Plans and purchases — not started
- M11 Native builds — not started
- M12 Scale the library — not started

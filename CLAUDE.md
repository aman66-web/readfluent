Read SPEC.md before doing anything. It is the source of truth.
Build strictly milestone by milestone (SPEC.md §10). Do not start the next milestone until the current one's "Done when" criteria pass.
Run `npm run typecheck && npm test` before every commit. Commit after each milestone with a message like "M1: content contract".
If the spec is ambiguous, choose the simplest option, implement it, and log the choice in DECISIONS.md (one line each).
Keep the UI mobile-first (375px wide first, then desktop).
This is not the Next.js you know: read `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).

## Decided — do not re-derive these

The product (1 Oct 2026): ReadFluent is real books, retold at a level (A1–A2, B1–B2,
C1–C2) and a length (50, 100, 200 pages), read one page at a time: a photo and 28–35
words. 9 categories, 30 books each, 270 books, 9 versions each, 2,430 versions. SPEC.md
has the rest. It is English-only until translation; colour-matched words wait for it.

The template (1 Oct 2026): the engineering underneath came from Mental Stint's `revise/`
(`aman66-web/span`, commit `8a7f13c`). The product did not. Nothing of Mental Stint's
content, credentials or identity ships: grep for `mental ?stint`, `mentalstint`,
`mental_stint`, `lumen`, `revise.` before every milestone commit. SPEC.md §8 lists what is
kept and what is replaced; follow it, do not re-audit it.

The app makes no calls to any AI model at read time (carried over from Mental Stint,
29 Sep 2026). A model is used only by offline scripts in `scripts/pipeline/`. Do not add
a runtime LLM call without the owner asking for one by name.

Content is data, not code (1 Oct 2026). Versions are JSON served from storage; photos and
audio sit in object storage behind a CDN. Never put a book, a photo or a clip in `public/`
or compile one into the bundle. Mental Stint did, and shipped 239 MB of audio into every
native build for months. `.capacitorignore` and the stub `webDir` stay; if
`scripts/check-native-bundle.mjs` fails, fix the cause, do not raise the limit.

A page is 28–35 words, a version's page count is exactly its length, and a version
publishes only when every gate passes. These are enforced by `scripts/validate-content.ts`,
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
- O6 Lex welcomes, then says how quick it is — done 1 Oct 2026, owner's request. After "Get started": Lex waves (`hello`), then Lex says "Just N quick questions" (`quick`, N from `QUESTION_STEPS` in `lib/onboarding/steps.ts`). Translations are first drafts.
- M1 Content contract — not started
- M2 Prove the content pipeline — not started (go/no-go on scale recorded in DECISIONS.md)
- M3 Library and the pick flow — not started
- M4 The reader — not started
- M5 Word cards — not started
- M6 Line audio — not started
- M7 Flashcards — not started
- M8 Accounts and sync — not started
- M9 Offline downloads — not started
- M10 Plans and purchases — not started
- M11 Native builds — not started
- M12 Scale the library — not started

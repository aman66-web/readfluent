# ReadFluent — SPEC

*Last updated 2026-10-01. Source of truth for what the product is and the order it is built in. Ambiguous calls live in DECISIONS.md. How to work in this repo lives in CLAUDE.md.*

**One line:** a mobile reading app where people learn a language by reading real books, retold at their level and at the length they choose.

**Tagline:** Real books. Your level.

## 1. Who it's for

Language learners who find lesson-style apps boring. They want real stories and ideas (Pride and Prejudice, a habits book) without getting lost in language that's too hard.

## 2. Core flow

1. Open the library, pick a book.
2. Tap **Read**.
3. Pick a level: **A1–A2** (beginner), **B1–B2** (intermediate), **C1–C2** (advanced).
4. Pick a length: **50 pages** (fast), **100** (medium), **200** (long).
5. Read page by page, swipe-through.

Every book exists in **9 versions** (3 levels × 3 lengths). A *version* is the unit of reading, downloading, selling and checking.

## 3. Reading screen

- A photo on every page (self-produced).
- 28–35 words of text under the photo — a page takes seconds.
- Page number and a progress bar.
- Mobile-first, designed at 375px.

## 4. Learning tools

The differentiator, carried over from the Hindi prototype.

| Tool | Behaviour |
| --- | --- |
| Word card | Tap any word → root word, form, pronunciation, meaning. |
| Colour-matched words | Matching words in the two languages share a colour. Needs a second language, so it waits for translation (DECISIONS.md). |
| Line audio | Audio for each line, plus "say it again, slowly". |
| Flashcards | Built from the words the reader met. |

Everything is in English for now; translation comes later.

## 5. Library

- **9 categories:** romance; crime; fantasy and sci-fi; self-help; business and money; religion and spirituality; health; history; science.
- **30 books each, 270 total.**
- **Classics** (public domain) keep their real titles, e.g. Pride and Prejudice.
- **Modern ideas** get original titles and original text, with an "inspired by" credit.

## 6. Content rules

- Every version is checked against its CEFR band before it ships.
- "Inspired by" books are genuinely new writing, never close retellings.
- Health books carry a "not medical advice" line.
- Nothing from Mental Stint ships: no content, no credentials, no identity.

## 7. Scale (the numbers that shape the build)

| Unit | Count |
| --- | --- |
| Books | 270 |
| Versions (books × 9) | 2,430 |
| Pages per book (3 levels × (50 + 100 + 200)) | 1,050 |
| Pages in the library | 283,500 |
| Words of text at ~31 words/page | ~8.8M |
| Photos: one pool of 200 per book, shared by all 9 versions (270 × 200) | 54,000 |
| Line-audio clips (one per page, normal speed; "slowly" is playback rate) | ~283,500 |

Estimates, to be replaced by measurements in M2. Consequences, already settled (owner, 1 Oct 2026 for the photo pool):

- Content is **data served from storage**, never compiled into the app build. Mental Stint compiles its books into the bundle (`lib/books/parts`, 5.3 MB for ~150 short books); that does not survive 8.8M words.
- Photos and audio live in **object storage behind a CDN**, never in the repo and never in `public/`.
- A version is one small JSON file. 2,430 of them are cheap; the photos and audio are the weight.
- **One photo pool per book: 200 scenes, nested.** Level never changes the pictures. The 200-page version uses all 200 scenes; the 100-page version uses every 2nd; the 50-page version uses every 4th. So the 50 are inside the 100, which are inside the 200, and a book is illustrated once, not nine times.
- **Nothing is on the phone until the reader asks.** The installed app is a thin shell (under 2 MB, enforced). Books are read from the server; only an explicit download stores anything, and photos are stored once per book, not once per version.

### Size per version (estimates, measured in M2)

At ~800 px wide WebP (~30–50 KB a photo) and mono speech audio (~50 KB a clip):

| Version | Photos | Audio | Text | Download with audio | Without audio |
| --- | --- | --- | --- | --- | --- |
| 50 pages | ~2 MB | ~2.5 MB | ~15 KB | ~4–5 MB | ~2 MB |
| 100 pages | ~4 MB | ~5 MB | ~30 KB | ~8–10 MB | ~4 MB |
| 200 pages | ~8 MB | ~10 MB | ~60 KB | ~16–20 MB | ~8 MB |

Photos are shared across a book's versions, so reading A2 then B1 of the same book stores the 200 photos once. Server side, ~54,000 photos (~2 GB) and ~283,500 clips (~14 GB) is a few tens of dollars a month in object storage, not a problem; the phone is the constraint, hence the rules above.

## 8. What the template gives us

The template is Mental Stint's `revise/` folder (repo `aman66-web/span`, subfolder `revise/`, commit `8a7f13c`, 2026-09-30). It is Next.js 16 / React 19 / TypeScript / Tailwind 4, Supabase, RevenueCat, and a Capacitor native shell. Audited 2026-10-01; this is what is there, not what the brief assumed.

### Keep

| Piece | Where | Notes |
| --- | --- | --- |
| Email-code sign-in, Google and Apple sheets, system-browser fallback, deep-link return | `lib/auth/native.ts`, `components/Account.tsx`, `components/auth/NativeAuthBridge.tsx`, `app/auth/callback` | The email flow is `signInWithOtp` then `verifyOtp` (a code, not a link). Hard-codes the `mentalstint://` scheme. |
| Reviewer-bypass | `lib/auth/review.ts` | Addresses in `NEXT_PUBLIC_REVIEW_EMAILS` sign in with a password and count as Pro. Pure and tested. |
| Anonymous-first session | `proxy.ts` | Every new device is signed in anonymously, so reading never needs an account. Also runs fully with no database ("local mode"). This is the answer to "do readers need accounts". |
| Subscription plumbing | `lib/purchases/*`, `app/api/revenuecat/webhook` | RevenueCat user id = Supabase user id, so the webhook writes a purchase straight onto `public.users` with no mapping table. Entitlement id is a constant (`mental_stint_pro`). |
| Plan guard | `supabase/migrations/0006_plan.sql` | A learner cannot write their own `plan`; only the service role can. Keep the guard, drop the Mental Stint rules around it. |
| Local-first store and sync | `lib/store/local.ts`, `lib/sync/*`, `0005_sync.sql`, `0007_sync_order.sql` | One `sync_docs` row per local document, last-write-wins on `updated_at`. Progress and flashcards are documents, so no migration per new field. |
| FSRS scheduler | `lib/srs/fsrs.ts`, `scheduler.ts` | Flashcards. Already tested. |
| Offline downloads | `public/sw.js`, `lib/books/offline*.ts`, `downloads.ts`, `components/OfflineBook.tsx` | "Nothing persists unless the user downloads it": one cache bucket per downloaded book, shared shell kept once. Generalise from per-book to per-version; the 672 lines also carry Mental Stint lists (diagram names, voice root) to remove. |
| Per-line narration | `lib/books/narration.ts`, `lib/voice.ts` | `lines.json` maps a line to a clip; autoplay and warm-up already handled. Closest thing to "audio for each line". |
| Native shell | `capacitor.config.ts`, `ios/`, `android/` | Live-wrapper: `server.url` points the WebView at the deployed site, because auth callback, sync and the webhook need a server. |
| CI, env template, docs shape | `.github/workflows/ci.yml`, `.env.example`, `README.md`, `RELEASE.md`, `DEPLOY.md` | CI is path-filtered to `revise/**`; fix on seeding. |

### Replace or remove

| Piece | Why |
| --- | --- |
| All content: `lib/courses`, `lib/course`, `lib/books/parts`, `components/book/editorial`, `public/voice` (239 MB), `public/scenes`, `public/diagrams`, `docs/midjourney`, `design/scenes`, `lib/books/free.ts` | Mental Stint's. |
| `lib/plan.ts` | Hard-codes "two books per subject" and Mental Stint's `ALWAYS_FREE` list. Keep the shape (`Plan`, `parsePlan`, `PRICE`, `pounds`), rewrite the rules. |
| `components/book/Reader.tsx` (1,046 lines) | One sentence per beat, SVG scenes, recall, XP, decks. It is coupled to all of that. Rebuild a small reader to the page model in §3; reuse its progress-bar and gate ideas, not its code. |
| Lumen, welcome, tour, XP, study, recall, decks, exams, import, grading, packs, rate | Mental Stint product. |
| All AI-backed pieces: `0003_claim_generation`, `0004_interpret_quota`, `0008_credits`, `@anthropic-ai/sdk` as a runtime dependency | The app makes no AI calls at read time (DECISIONS.md). The content pipeline uses a model offline, from scripts. |
| `supabase/migrations/0001_init.sql` | Its decks/cards/card_states tables "never shipped" (per 0005's own comment). Write a new init: `users`, `sync_docs`, `events`, plus 0006's guard. |
| `lib/i18n/settings/*` (20 languages) and the `keys/*` strings | English only for now. Keep the `fill`/strings mechanism; write fresh English keys. |
| Identity: app name, `mentalstint://`, `com.amanmarwaha.MentalStint`, `mental_stint_pro`, `revise.*` storage keys (38 files), `revise-<build>` cache names, `MARKETING_HOSTS` defaults, `public/site`, icons, manifest | None carries over. New storage prefix is `readfluent.`. |
| Credentials | New Supabase project, Vercel project, RevenueCat app, iOS and Android keystores. Nothing is copied. `.env*` is never committed. |

### Known problems in the template, fixed here

- **No `.capacitorignore`, and `webDir` is `public`.** `cap sync` copies `webDir` into every native build, so the 239 MB voice folder rides along. ReadFluent adds `.capacitorignore` on day one *and* points `webDir` at a tiny stub folder, so the guarantee does not rest on one file being remembered (DECISIONS.md).
- **Stale prefixes.** The `revise.` storage-key prefix survived two renames. Pick the prefix once, in one constant.
- **CI is hard-wired to `revise/`.** The repo root is the app here.

## 9. Architecture

```
Authoring (offline, scripts/)            Serving                       App (web + Capacitor)
────────────────────────────            ───────                       ──────────────────────
brief → write → CEFR gate → pages  ───▶  object storage + CDN   ───▶  library → read → tools
        photo prompt → photo             content/<slug>/<level>-<len>.json    swipe reader
        audio script → clip              photos/<slug>/<n>.webp               word card
                                         audio/<slug>/<level>-<len>/<n>.mp3   flashcards (FSRS)
Supabase: users, sync_docs, events       RevenueCat → webhook → users.plan    offline = explicit download
```

### Content model

```
Book    { slug, title, author?, kind: "classic" | "inspired", inspiredBy?, category, blurb, cover, health?: true, scenes: Scene[200] }
Scene   { n: 1..200, photo, prompt }          // the book's one photo pool; written once, level-independent
Version { slug, level: "A1A2"|"B1B2"|"C1C2", length: 50|100|200, pages: Page[], checks }
Page    { n, text, scene, audio? }            // text: PAGE_WORDS (28–35); scene is one of the book's 200, nested: 200 = all, 100 = every 2nd, 50 = every 4th, strictly increasing
Entry   { root, form, pron, meaning }         // ONE library-wide dictionary keyed by headword, shared by every book; a book downloads only its slice (dict/<slug>.json). Per-book sense override where a word means something else there. One per language later
checks  { cefr, wordCountOk, pageCountOk, generatedAt, pipeline }
```

A version is publishable only when every page passes. The reader consumes `Version` JSON; it never calls a model.

### Local-first, accounts optional

Reading, progress, words met and flashcards work with no account and no network once a version is downloaded. Progress and flashcards are `sync_docs` documents, so a signed-in reader has them on every device. Purchases and cross-device sync need an account; reading a free sample does not.

## 10. Build milestones

Build in this order. Do not start the next milestone until the current one's *Done when* passes. Every milestone ends with `npm run typecheck && npm test` green, a commit `Mn: <name>`, and a build-log line in CLAUDE.md.

Why this order: the content pipeline is the one risk that can change the product (can a script produce level-accurate retellings at 2,430-version scale?), so it is proved in M2, before any reader is polished against content that may not exist.

**M0 — Seed and strip**
Copy the template from `span/revise` at `8a7f13c` to this repo's root, excluding everything in §8 "Replace or remove" that is content. Rename identity (app name, bundle id, URL scheme, entitlement, storage prefix, cache names). Fresh `.env.example`. New `0001` migration. `.capacitorignore`, stub `webDir`, `capacitor.config.ts` with a clearly placeholder `PRODUCTION_URL`. Fix CI paths. English-only strings. Stub home screen.
*Done when:* `npm ci && npm run lint && npm run typecheck && npm test && npm run build` pass; `grep -ri -E "mental ?stint|mentalstint|mental_stint|lumen|revise\."` over tracked files returns nothing outside SPEC.md, DECISIONS.md and CLAUDE.md; tracked size is under 15 MB; `scripts/check-native-bundle.mjs` proves `webDir` plus `.capacitorignore` yields under 2 MB (and `cap sync` on a Mac is logged as run); no `.env*` or keystore is tracked.

**M1 — Content contract**
Zod schemas for Book, Scene, Version, Page, Entry (§9) and one `PAGE_WORDS` constant. A validator CLI (`scripts/validate-content.ts`) checking: words per page within `PAGE_WORDS`, page count equals length, 3 levels × 3 lengths present, the book has exactly 200 scenes whose photos resolve, every page's scene is in its length's nested subset (200 all, 100 every 2nd, 50 every 4th) and increasing, "not medical advice" present on every health book. A loader. One public-domain fixture book with all 9 versions (placeholder text of correct shape; real text comes from M2).
*Done when:* the fixture validates; tests reject a 27-word page, a 36-word page, a 49-page "50" version, a missing version, a page pointing at a scene outside its length's subset, a book with 199 scenes, and a health book without the line.

**M2 — Prove the content pipeline**
`scripts/pipeline/`: brief → one 200-beat storyboard per book (level-independent) → 200 photo prompts and photos → per version, write page text anchored on its scenes → word-count gate → CEFR gate → dictionary entries for new headwords only → audio scripts → publish JSON. Resumable per version, cost-capped, logs every rejection. Pilot: 3 books (one classic, one "inspired", one health) × 9 versions = 27 versions.
*Done when:* all 27 pass every gate with no hand edits to page text; a deliberately too-hard C2 text submitted as A1–A2 is rejected by the CEFR gate; the "inspired" pilot passes an originality check against its source brief; the run reports cost, time and rejection rate per version, and those extrapolate to 2,430 versions in `DECISIONS.md` with a go/no-go.

**M3 — Library and the pick flow**
Library by 9 categories, search, book jacket, Read → level → length → reader. Level and length remembered per book. The "inspired by" credit and the health line on jackets.
*Done when:* at 375px a reader goes from Library to page 1 of a chosen version in four taps or fewer; categories and counts come from content, not code; a screenshot at 375px is checked into the build log.

**M4 — The reader**
Swipe-through pages: photo, 28–35 words, page number, progress bar. Resume where left. Only the current and next two photos are mounted; the next two are preloaded.
*Done when:* swipe, tap-edge and keyboard all turn pages; reload resumes at the same page; a 200-page version scrolls end to end with at most 5 images in the DOM; every page of the pilot content fits the screen at 375×667 with no scrolling.

**M5 — Word cards**
Tap any word → card with root, form, pronunciation, meaning, from the version's `words` map. Words met are recorded once per word.
*Done when:* every word of every pilot page opens a card or a clear "no entry" state; no page layout shifts when a card opens; the words-met log has no duplicates after re-reading a page.

**M6 — Line audio**
Per-page audio, "say it again, slowly" (playback rate, pitch preserved, no second recording), optional autoplay. Adapt `narration.ts`; clips come from storage, not `public/`.
*Done when:* every pilot page plays; slow playback is 0.7× and does not change pitch; swiping stops the clip; a page with no clip shows no broken button.

**M7 — Flashcards**
Words met become cards scheduled by FSRS; a review session; due count on the home screen.
*Done when:* after reading five pilot pages the met words are due; the FSRS unit test "Again is due sooner than Hard, Hard sooner than Good, Good sooner than Easy" passes on this repo's scheduler; a reviewed card leaves the due list.

**M8 — Accounts and sync**
Wire the kept auth (email code, Google, Apple) to ReadFluent's own Supabase project; anonymous-first; progress and flashcards as `sync_docs`; reviewer-bypass accounts.
*Done when:* an anonymous reader who signs in keeps every bookmark and card; a second browser signed into the same account receives them; a store-reviewer address signs in with a password and is Pro; with no database configured the app still reads in local mode.

**M9 — Offline downloads**
Generalise `sw.js` from per-book to a per-book photo bucket (200 photos, kept once however many versions are downloaded) plus a per-version bucket (text and audio). Download with or without audio, progress, remove, and a storage-used readout. Removing the last version of a book removes its photos. Delete every Mental Stint list from the worker.
*Done when:* a downloaded version reads in airplane mode, photos and audio included; a version that was *not* downloaded leaves nothing in Cache Storage after being read online (the "nothing persists" audit); downloading A2 then B1 of one book stores the photos once; downloading without audio stores none; removing a download frees its bucket; the shell is cached once, not per version; the installed app bundle is under 2 MB.

**M10 — Plans and purchases**
Rewrite `lib/plan.ts` to the chosen model (default: free 50-page samples, paid 100/200). RevenueCat entitlement and offering, webhook, paywall, restore. A version already started stays open.
*Done when:* a sandbox purchase flips `users.plan` through the webhook and unlocks 100/200 on a device; a free reader is stopped at a 100/200 door and not at a 50; a tampering `update users set plan='full'` from the client is refused by the guard; the webhook rejects a wrong secret.

**M11 — Native builds**
Own bundle id, URL scheme, icons, splash. iOS and Android builds from the live-wrapper. Keystores generated and backed up outside the repo. RELEASE.md rewritten for ReadFluent.
*Done when:* both apps install on a device, sign in with Google and Apple, read a downloaded version offline, and complete a sandbox purchase; the built app bundle contains no content, photos or audio; RELEASE.md has been followed once end to end.

**M12 — Scale the library**
Run the pipeline over the 270-book list in category batches, with the QA report per batch. Photos and audio generated and uploaded. Classics copyright-checked per launch market.
*Done when:* 270 books × 9 versions publish with zero failing gates; a random 2% sample is human-read and passes; storage and CDN cost per active reader are measured and written down.

**Then:** launch to a small group, measure §12 for two weeks, decide translation.

## 11. Acceptance tests

1. A page of 27 or 36 words is rejected; 28 and 35 pass.
2. A version's page count equals its length (50, 100 or 200); a book has all nine versions.
3. A too-hard text submitted as A1–A2 fails the CEFR gate; the same text passes as C1–C2.
4. A health book without the "not medical advice" line fails validation.
5. A reader reaches page 1 of a chosen version from the library in four taps or fewer at 375px.
6. Reload resumes the same page; progress survives an anonymous → signed-in upgrade.
7. Every word on every pilot page opens a card or the "no entry" state.
8. "Slowly" plays at 0.7× with pitch preserved and needs no second clip.
9. FSRS: Again is due sooner than Hard, Hard sooner than Good, Good sooner than Easy.
10. A downloaded version reads offline; an undownloaded one leaves nothing in Cache Storage.
11. A client cannot set its own `plan`; the webhook rejects a wrong secret and ignores a non-entitlement event.
12. A store-reviewer address signs in with a password and is Pro; a lookalike address is not.
13. The native bundle holds no content, photos or audio.

## 12. Metrics (track from day one, in the `events` table)

| Metric | Target |
| --- | --- |
| Activation (opened a version and reached page 10 on day one) | ≥ 50% |
| Completion of a 50-page version | ≥ 35% |
| D1 / D7 return | ≥ 35% / ≥ 20% |
| Word cards opened per reading session | tracked |
| Flashcard reviews per week per reader | tracked |
| Free → paid conversion | tracked |
| Pipeline: versions passing every gate first time | ≥ 85% |

Events: `version_opened {slug, level, length}`, `page_reached {n}`, `version_finished`, `word_opened`, `audio_played {slow}`, `download_started`, `paywall_seen`, `purchase`, `signin_upgrade`.

## 13. Still to decide

Each has a working default in DECISIONS.md so the build isn't blocked.

- **Pricing** — e.g. free 50-page samples with a paid upgrade.
- **Accounts** — optional by default (anonymous-first, the template's behaviour).
- **Offline reading** — explicit download only.
- **First translation languages.**
- **Launch phones** — iOS, Android, or both first.
- **Photo source** — decided: generated, 200 per book (DECISIONS.md); style and tool still to pick in M2.
- **Where photos and audio are stored** — Supabase Storage by default.

## 14. Risks

- **Level accuracy.** Run every text through a CEFR checker; calibrate it on the M2 pilot.
- **Inspired-by originality.** Must be new writing, never a close retelling.
- **Health content.** Needs the "not medical advice" line, validated, not remembered.
- **Production load.** 2,430 versions is only realistic with a script that automates writing and checks. Photos and audio are the larger bottleneck: ~283,500 pages, each needing both.
- **Photo licensing and consistency.** 54,000 generated images need a usage-rights check on the chosen tool and one consistent style per book so 200 scenes look like one story.
- **Classics edition.** Only public-domain texts keep their real titles; each classic needs a copyright check in every market we launch in.
- **Bundle bloat.** Mental Stint shipped 239 MB of audio into every native build for months. Guarded by `.capacitorignore`, a stub `webDir`, and acceptance test 13.
- **Template drag.** 38 files carry the old storage prefix and several carry the old name; the M0 grep is the safety net.

## 15. Out of scope for v1

Translation UI, a second UI language, social features, in-app authoring, runtime AI calls, and anything from Mental Stint's content or identity.

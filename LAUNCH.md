# ReadFluent: what is left before real readers use it

Written 2 Oct 2026. "You" is the owner, "me" is Claude. Order matters: each phase unblocks the next. Tick things off as they are done.

## Where it stands today

Built and working: the first-run (18 screens, 20 languages, Dewey), dashboard with levels and XP, library and book pages, the reader with word cards, flashcards with phrase decks, Talk with Dewey, friends and league, achievements, premium sheet, listen-to-page.

Not real yet: the library is **270 books** (30 in each of nine categories), each only in the 50-page length and English only, with a fact-check owed on the classics written from memory; every page uses **one placeholder picture**; nothing is saved to an account (progress, XP and words live on the phone only); nobody can buy anything; there is no native app yet.

---

## Phase 1: switch on the real services (you, about a day; I guide each step)

- [ ] **Supabase project**: create it, run `supabase/setup.sql` once (it includes friends and Talk), turn on email and Google (and Apple) sign-in, add the site's address as a redirect. Steps are in `SUPABASE.md`.
- [ ] **Vercel settings**: add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, then redeploy. `/api/health` should then say `db: true`.
- [ ] **Anthropic key**: add `ANTHROPIC_API_KEY` (switches on Talk, and is needed to write the other 195 books). Set a monthly spending limit on the key.
- [ ] **Email sending for sign-in codes** (blocks emailed sign-in at any real size): Supabase's built-in sender is limited to a few emails an hour, sends a link instead of a code, and cannot be edited on the free plan. Needs a custom SMTP service (Brevo/Resend/Postmark) on a domain you own, then the template with `{{ .Token }}` (README, "Sending the sign-in code"). Google and Apple sign-in work without it.
- [ ] **A real domain** and the address in `PRODUCTION_URL`; a support email address.
- [ ] **Legal pages, final read**: `/privacy`, `/terms` and `/support` are real pages (3 Oct 2026) but still need a lawyer's or the owner's read, a real support email address, and the data controller's name; add a cookie/analytics notice if you use analytics.
- [ ] **Decide prices and the free tier** (today's working default: 50-page books free, 100 and 200 paid; £5.99 a month, £39.99 a year).

## Phase 2: the books (the biggest job)

- [ ] **Run the real pilot** of the book pipeline on 3 books (needs the Anthropic key), read the results, and fix the prompts. You approve the cost before the other 197.
- [x] **First library written (2 Oct 2026)**: 270 books, 3 levels, 50 pages each, every one passing `scripts/books/check-en.ts`.
- [ ] **100 and 200-page editions, and a fact-check of every book** (the writers flagged the ones they wrote from memory: see CLAUDE.md, R4). Every version must pass the checks (`scripts/pipeline/validate.ts`). Health books need their "not medical advice" line.
- [ ] **Real pictures**: one generated photo per page, a pool of 200 per book, stored in object storage behind a CDN (not in the app). Today's single placeholder goes.
- [ ] **Translate every book** into the 19 other languages, page for page, with a word card for every word. Today only 4 books exist in Spanish.
- [ ] **Titles, descriptions and chapter lines** for each new book in all 20 languages (I have set this up; it is one small file per language per book).
- [ ] **Native-speaker review** of everything translated: the app's words, the phrase decks, the book translations, the word cards, and a test of Talk in each language.
- [ ] **Check rights** for every book (public domain in the countries you sell in; "inspired by" books are original text).
- [ ] **Narration** (line audio, milestone M6): decide voices and cost, record or generate, host in storage; offered as an optional extra in downloads.

## Phase 3: finish the engine (me)

- [ ] **M1 content contract and M3/M4**: read books from storage instead of the preview folder, delete the preview slice, final library and reader.
- [ ] **M8 accounts and sync**: progress, XP, saved words, flashcards and streak saved to the account and merged across devices (today they are local only).
- [ ] **M9 offline downloads**: download a version (and its photos, optional audio) and read with no signal; nothing is stored unless asked.
- [ ] **M10 purchases**: RevenueCat products and the webhook proven end to end in the stores' sandboxes, then turn on `PAYMENTS_LIVE`. Restore purchases, subscription terms shown as the stores require. You create the store products and the RevenueCat account.
- [ ] **XP and flashcards joined up**: XP from word taps and reviews; the daily targets and achievements follow.
- [ ] **Reminders**: a daily reading reminder and streak warning (local notifications on the phone), with the choice of time.
- [ ] **Placement test** for languages other than English (today English only).
- [ ] **Dark mode** (the app is white only today).
- [ ] **Safety around other people**: a name filter, report and block for friends and the league, and a check that Talk cannot be pushed off topic. XP in the league is reported by the phone, so it is friendly rather than provable; decide if prizes ever depend on it.
- [ ] **Things other language apps have that we do not yet**: streak freeze, pronunciation practice (say the line, get feedback), highlight and bookmark, export your word list, share your streak, referral rewards, home-screen widget, "word of the day".

## Phase 4: quality (me, with you testing on your iPhone)

- [ ] **Real-phone testing** on several iPhones and Androids (small and large screens, notch, keyboard, slow network, airplane mode, install to home screen).
- [ ] **Accessibility**: VoiceOver and TalkBack walk-throughs, large text, contrast, every screen right-to-left in Arabic and Urdu.
- [ ] **Speed**: page weight, first screen under 2 seconds on a mid phone, photos and audio from the CDN, the 2 MB thin-shell rule kept.
- [ ] **Automatic tests in CI**: run typecheck, lint, tests and a browser test of the main journey on every change; a staging copy of the site separate from the live one.
- [ ] **Security pass**: database rules reviewed, rate limits on every server route, no secrets in the app, dependency check, a basic outside penetration test before launch.
- [ ] **Watching it**: error reporting, uptime alerts, database backups, privacy-friendly analytics (sign-up to first page to day-7 return).
- [ ] **Privacy and law**: data export and deletion (deletion exists), age rules (decide minimum age and what happens for under-13s), GDPR/UK-GDPR and California notices, the stores' privacy forms.
- [ ] **Cost guards**: a daily cap on Talk messages (exists, 40) plus an overall monthly cap and an alert on your spend.

## Phase 5: native apps and the stores

- [ ] **Accounts you create**: Apple Developer ($99 a year), Google Play ($25 once), and the signing keys (never put in the code).
- [ ] **Sign in with Apple** (the App Store requires it when Google sign-in is offered), Google client ids, app ids, final icon and splash.
- [ ] **M11 native builds**: Capacitor build on a Mac, TestFlight and Play internal testing, push the first builds to testers.
- [ ] **Store listings**: name, subtitle, description, keywords, 6 screenshots per size, preview video, age rating, subscription disclosure text, support and privacy URLs, data-safety answers.
- [ ] **Beta**: 20 to 50 real learners for two weeks; fix what they hit; watch whether they come back on day 2 and day 7.
- [ ] **Launch plan**: a simple landing page, a waiting list, launch-day posts, a way for people to reach you, and who answers support.

## Ready for consumers when

1. Phases 1 to 5 above are ticked, and at least **a first catalogue** (for example 30 to 50 books in every level and length, fully translated and reviewed in the launch languages) is live. The rest of the 200 can keep arriving after launch; launch languages can be fewer than 20 if review is not finished.
2. A purchase, a restore, a sign-in on a second phone and an offline download all work on a real phone from a store build.
3. Nothing in the app is a placeholder: pictures, privacy text, prices, icons, translations.

## What I can start on the moment you say go

Phase 3 can start now without waiting on you (sync, offline, reminders, dark mode, safety, tests in CI). Phase 2's pilot starts the moment the Anthropic key is added. Phase 1 is the real blocker: until Supabase and the keys are in, nothing can be saved to an account and nobody can sign in.

# Finishing ReadFluent: who does what

Written 5 Oct 2026. Three Claudes, one app. **Owner** = you.

| Who | Where it runs | What it does best |
|---|---|---|
| **Claude (cloud)** | this chat | All the code: sync, payments wiring, offline, tests, fixes, content jobs; reads/writes the repo, runs the Supabase and Vercel tools |
| **Claude in Chrome** | your browser | Everything that is clicking in a website: Google, Apple, App Store Connect, Play Console, RevenueCat, the email service, DNS, Vercel settings |
| **Claude on the Mac** | your Mac terminal | Everything that needs Xcode, the iPhone and Android: native builds, TestFlight, real-device tests, Apple's free translator for book translations |

## What only YOU can do (no Claude may do these, on purpose)

Typing passwords, 2FA codes and security answers; accepting legal agreements; paying (Apple $99, Google $25, a domain); deciding prices; creating the first Apple/Google/RevenueCat accounts if they do not exist. A Claude will stop and hand over at each of these. **Never paste a secret key into a chat**: put it in Vercel's environment variables yourself (Claude in Chrome can open the page; you paste the value).

## The hand-over rule (put at the top of every prompt)

When a step needs the owner (a password, 2FA, an agreement, a payment, a key to paste, a decision), the Claude does NOT skip it and does NOT ask vaguely. It (1) opens or prints the exact page link, (2) says in one sentence what to click or type there and why, (3) says "tell me 'done' and I will carry on", then (4) waits and continues with the next step on its own. It keeps a running checklist so nothing is lost if the owner closes the window.

## The order (each step unblocks the next)

1. **Chrome: Prompt A** (accounts that cost nothing: Google sign-in, email service, domain). *~1 hour of your time.*
2. **You:** Apple Developer ($99) and Google Play ($25): **paid 5 Oct 2026** (approval can take up to 48 h; the Chrome prompt checks this first).
3. **Claude (cloud), in parallel from now:** account sync (M8), then offline downloads (M9), reminders, dark mode, safety, tests in CI. Needs nothing from you.
4. **Mac: Prompt C** (first iPhone build onto your phone and TestFlight). Needs step 2.
5. **Chrome: Prompt B** (App Store Connect, Play Console, RevenueCat products). Needs step 2.
6. **Claude (cloud):** payments wiring and the sandbox test (M10) once the products exist.
7. **Mac: Prompt D** (real-phone test round, then the beta builds).
8. **Beta** with 20 to 50 learners for two weeks, then **launch**.

---

## Prompt A: Claude in Chrome (free accounts and services)

Paste into Claude in Chrome. It opens each site, does the clicking, and hands over to you (with the exact page) at every password, 2FA, payment or agreement, then carries on.

```
You are helping me (a non-technical owner) switch on the services for my app ReadFluent (live at https://readfluent-eta.vercel.app, code at github.com/aman66-web/readfluent). Work step by step in my browser. RULES: never type or guess a password, 2FA code, card number or security answer: stop and ask me. Never accept a legal agreement or pay anything for me: stop and show me the button. Never read a secret key out loud or paste it into this chat: when a key must go into Vercel, open the Vercel page, tell me exactly which box, and I will paste it myself. Tell me in one plain line what you are about to do before each step, and what you did after. If a page looks different from what I describe, say so rather than guess.

My Supabase project is "readfluent" (ref erilcjzbnomgxhjnurce) and Vercel project "readfluent" is already wired to it.

STEP 1 - Google sign-in. Google Cloud Console -> create a project "ReadFluent" -> OAuth consent screen (External, app name ReadFluent, my support email, privacy page https://readfluent-eta.vercel.app/privacy, terms /terms) -> Credentials -> create THREE OAuth client IDs: Web (authorised redirect URI: https://erilcjzbnomgxhjnurce.supabase.co/auth/v1/callback), iOS (bundle id com.amanmarwaha.ReadFluent), Android (package com.amanmarwaha.ReadFluent; I will give you the SHA-1 later from the Mac). Then Supabase dashboard -> Authentication -> Providers -> Google: turn on, paste the Web client ID and secret (I paste the secret myself). Test: open the site, sign in with Google, confirm it works. Then tell me the three client IDs (IDs are not secret) so I can give them to my developer.

STEP 2 - Email for sign-in codes. Create a free Resend (or Brevo) account. Verify a sending domain: if I do not own a domain yet, stop and help me pick one (suggest 3 names, check availability on a registrar, show me the price, and let ME buy it). Add the DNS records Resend gives (SPF, DKIM) at my registrar. In Supabase -> Authentication -> Emails -> SMTP Settings: turn on custom SMTP with the Resend details (I paste the key). Then edit the "Magic Link" and "Confirm signup" templates so the email shows the 6-digit code: use {{ .Token }} and say "Your ReadFluent code is {{ .Token }}". Test by signing in with my email on the live site.

STEP 3 - Vercel settings. In Vercel -> readfluent -> Settings -> Environment Variables, check these exist for Production and Preview: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Add NEXT_PUBLIC_SUPPORT_EMAIL (my support address: ask me), ANTHROPIC_API_KEY (I paste it; create the key at console.anthropic.com first with a MONTHLY SPEND LIMIT of 20 dollars, ask me before saving it). Add my domain under Settings -> Domains once I own one, and tell me the DNS records to set. Redeploy and open /api/health: it must say ok, db and service true.

STEP 4 - Supabase hardening. Authentication -> URL Configuration: Site URL = my site (or domain), add redirect URLs for https://readfluent-eta.vercel.app/** and readfluent://**. Turn ON "Confirm email" and leave anonymous sign-ins ON (the app reads anonymously). Authentication -> Rate Limits: leave defaults. Project Settings -> Database -> turn on daily backups if the plan allows, and tell me if it needs a paid plan.

At the end give me a short checklist: done / needs me / blocked, with the exact next action for each.
```

## Prompt B: Claude in Chrome (stores and payments), after you have paid Apple and Google

There are already two long prompts for the sign-in and store pieces: `STORE-SETUP-PROMPT.md` (Apple sign-in, App Store Connect, Google Play Console) and `SETUP-PROMPT.md`. Run those first. Then paste this one for the money side:

```
Continue helping me with ReadFluent (same rules as before: never type passwords/2FA/card details, never accept agreements or pay for me, never show secrets in chat).

STEP 1 - RevenueCat. Create a free RevenueCat account and a project "ReadFluent". Add an iOS app (bundle id com.amanmarwaha.ReadFluent) and an Android app (package com.amanmarwaha.ReadFluent). Create one entitlement called "premium". Create offerings: "default" with two packages, monthly and yearly.
STEP 2 - Subscriptions in App Store Connect and Play Console. In App Store Connect -> my app -> Subscriptions: create a subscription group "ReadFluent Premium" with two auto-renewing subscriptions: product ids rf_premium_monthly (price: ask me, working default 5.99 GBP) and rf_premium_yearly (working default 39.99 GBP), 7-day free trial on both, names and descriptions in English, and a review screenshot placeholder (tell me what screenshot is needed). Do the same in Google Play Console -> Monetize -> Subscriptions with the same product ids. Fill in the "Paid applications" agreements/tax/bank forms by STOPPING and telling me which ones I must fill in myself.
STEP 3 - Link them. In RevenueCat attach both products to the "premium" entitlement and to the offering. Give Apple's In-App Purchase key (.p8) and Google's service-account JSON to RevenueCat: for each, guide me to create the key in the store, then I upload it myself.
STEP 4 - Webhook. In RevenueCat -> Integrations -> Webhooks: URL https://readfluent-eta.vercel.app/api/revenuecat/webhook, and an authorization header value: tell me to generate a long random string myself and put the same value in Vercel as REVENUECAT_WEBHOOK_SECRET (I paste it). Copy the two PUBLIC SDK keys (iOS and Android, they start with appl_ and goog_) and tell me them: they are not secret.
STEP 5 - Sandbox testers. In App Store Connect -> Users and Access -> Sandbox: create one tester with an email I own. In Play Console -> License testing: add my Google account.
Finish with a checklist of what is done and what I still must do myself.
```

## Prompt C: Claude on the Mac (terminal), builds and your phone

Run in Terminal on the Mac: `cd ~/readfluent && claude` (clone first if needed: `git clone https://github.com/aman66-web/readfluent && cd readfluent && git checkout claude/readfluent-template-setup-ewq3lj`). Turn on auto mode (Shift+Tab) so it does not ask for every command.

```
Read CLAUDE.md, README.md (the native build section) and FINISH-PLAN.md first. You are the Mac half of finishing ReadFluent: the cloud Claude writes app code and pushes to branch claude/readfluent-template-setup-ewq3lj; you build and test it on real devices. Rules: never paste or print secrets; never commit .env, keystores, .p8/.p12 or provisioning files; Xcode signing and Apple ID prompts, passwords and 2FA are mine to type (stop and tell me); do not push to any other branch; commit your changes in small, clearly named commits and push them.

1. Set up: install what is missing (Homebrew, Node 22, Xcode command line tools, CocoaPods not needed: the project uses Swift Package Manager, JDK 21 in ~/jdk21 for Android because Gradle 8.14 cannot run on Java 25). npm install. Run npm run typecheck && npm test.
2. iOS: npx cap sync ios (if it complains about webDir read capacitor.config.ts and .capacitorignore; do not raise any size limit). Open ios/App/App.xcworkspace or App.xcodeproj in Xcode, set my Team under Signing & Capabilities, bundle id com.amanmarwaha.ReadFluent. Build and run on my iPhone (tell me when to plug it in and trust the computer). The app loads https://readfluent-eta.vercel.app, so a web fix is live without a rebuild. Check these on the phone and write down exactly what works and what does not: new Pluto icon and splash; the on-device translator (Apple Translation: pick French/Spanish/Japanese, open a book, does the page translate, do coloured underlines appear on every word, does tapping a word light the English partner); Listen button and the speaking test (microphone permission strings in Info.plist: NSMicrophoneUsageDescription and NSSpeechRecognitionUsageDescription must exist and be worded for readers; add them if missing); the keyboard guidance; the level test dictation/writing screens; the language-switch loader. Fix native problems yourself when they are in ios/ code; for web-code problems write each one up in a file NATIVE-TEST-REPORT.md with screen, steps, what happened, a screenshot path if you took one, and push it so the cloud Claude can fix it.
3. Speech recognition: WKWebView has no web SpeechRecognition. Add the Capacitor community speech-recognition plugin (@capacitor-community/speech-recognition), register it, and tell me what the cloud Claude must change in lib/reading/listen.ts to use it when Capacitor.isNativePlatform() (write that as a section in NATIVE-TEST-REPORT.md; do not edit lib/ yourself).
4. Android: use JDK 21, npx cap sync android, build a debug APK (cd android && ./gradlew assembleDebug), install on an emulator or my Android phone with adb, repeat the checks above (ML Kit translator, speech). Report the same way.
5. TestFlight: once my Apple Developer membership is approved, archive the app (Product -> Archive), upload to App Store Connect and add me as an internal tester. Walk me through every click I must do myself.
6. Apple translation job (optional, only when I say so): scripts/apple-translate/BRIEF.md.
When finished, push, and give me a short list: works / broken / needs the cloud Claude / needs me.
```

## Prompt D: Claude on the Mac, the beta round (later)

```
Read NATIVE-TEST-REPORT.md and git log. Pull the latest. Build a fresh iOS archive and Android release bundle (.aab). For Android create a keystore ONCE in ~/readfluent-keys (outside the repo, never committed) with a strong password I type, and tell me to back it up. Upload the iOS build to TestFlight and the .aab to Play internal testing. Then write BETA-CHECKLIST.md: the 15 things a tester should try, and how I invite 20 to 50 people (TestFlight public link, Play internal testing link).
```

---

## What the cloud Claude (me) does, in this order

1. **M8 account sync**: XP, saved words, flashcards, streak, coins, outfits, quick-check history, level-test results saved to the account and merged across phones.
2. **Native speech** hookup once the Mac Claude has added the plugin.
3. **M10 payments** wiring and a sandbox test plan once the products exist.
4. **M9 offline downloads.**
5. Reminders, dark mode, report/block for friends, streak freeze, placement test for more languages.
6. Fix everything the Mac report and the Chrome checklists turn up.
7. Content: finish the 126 books still at 50 pages (needs your OK on cost), real page pictures, fact-check list, translation review packs for native speakers.
8. Keep this file and LAUNCH.md current.

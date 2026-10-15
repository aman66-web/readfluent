# Putting ReadFluent on the App Store (written 5 Oct 2026)

Who does what: **Mac Claude** (Terminal on the owner's Mac) builds and uploads. **Chrome Claude** fills in App Store Connect in the browser. **The owner** signs in, enters passwords or 2FA codes, and presses the final Submit. Nobody submits for review until the owner says "submit".

Facts: app name ReadFluent, bundle id `com.amanmarwaha.ReadFluent`, team CLARIFO DEVELOPERS LTD, iPhone only (`TARGETED_DEVICE_FAMILY = 1`), version 1.0, free app with two auto-renewing subscriptions in group "ReadFluent Full" (`readfluent_monthly` £5.99, `readfluent_yearly` £39.99, both with a 7-day free trial), entitlement `readfluent_pro`. The app is a thin native shell that loads https://readfluent-eta.vercel.app (`capacitor.config.ts`).

## A. Before anything (owner, 10 minutes)

1. Confirm a sandbox purchase works end to end on the iPhone (Profile -> Premium -> Start free trial -> double-click side button). It should say "You're in. Enjoy every book!". Tell the cloud Claude; it then switches on the paid-features lock (`PAYMENTS_LIVE` in `lib/plan.ts`) so reviewers see the real thing.
2. Support email is set to aman66@hotmail.co.uk (Vercel `NEXT_PUBLIC_SUPPORT_EMAIL`); the Support and Privacy pages show it.

## B. Mac Claude (Terminal) - build, check, upload

Steps, in order. Stop and tell the owner in plain words whenever a password, 2FA code or a click in Xcode/Apple's website is needed.

1. `cd ~/Projects/readfluent && git pull origin claude/readfluent-template-setup-ewq3lj`. Commit the owner's local changes first (microphone wording, NATIVE-TEST-REPORT.md) - never commit keys, `.env*`, `.p8`, `.p12`.
2. `npm install && npm run typecheck && npm test && npm run check:native && npx cap sync ios`.
3. Open `ios/App/App/Info.plist` and make sure these exist with plain-English reasons (add if missing):
   - `NSMicrophoneUsageDescription`: "ReadFluent uses the microphone for the speaking tests, so you can practise saying words and sentences."
   - `NSSpeechRecognitionUsageDescription`: "ReadFluent turns what you say into text to check your speaking in the tests."
   - `ITSAppUsesNonExemptEncryption` = false (already there).
4. Privacy manifest: make sure the app target has `ios/App/App/PrivacyInfo.xcprivacy` (it is in the repo; add it to the target if Xcode does not list it): no tracking, `NSPrivacyAccessedAPITypes` for UserDefaults (reason CA92.1) and file timestamp (C617.1), and collected data types: name, email address, user ID, product interaction, purchase history, other user content (App Functionality) and other data types (the first-run answers, Analytics), all linked to the user, none for tracking. The App Privacy answers in App Store Connect must list the same.
5. App icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` must be 1024x1024 with NO transparency (flatten onto the cyan background if it has alpha).
6. Version 1.0, build number: set `CURRENT_PROJECT_VERSION` higher than anything uploaded before (1 if this is the first upload; otherwise +1).
7. Archive: Xcode -> scheme App -> destination "Any iOS Device (arm64)" -> Product -> Archive (or `xcodebuild -workspace/-project ... -scheme App -configuration Release archive`). Signing: automatic, team CLARIFO DEVELOPERS LTD. Then Distribute App -> App Store Connect -> Upload. If Xcode asks for the Apple ID or a 2FA code, stop and tell the owner which window to use.
8. Screenshots (needed for the store page): iPhone 14 Plus simulator (1284x2778), real app loaded, English interface, learning Spanish, status bar overridden to 9:41 and full battery. Sign-in is required, so the owner signs in on the simulator. Six screens, saved to `~/Desktop/ReadFluent-screenshots-v2/`: 1_home, 2_library, 3_book, 4_reader, 5_recall, 6_quiz. **No price, "free", "trial", "Pro" badge or Premium window in any of them** (Apple rejected build 20261007 under 2.3.7 for a price reference in a screenshot). No personal data. Check sizes with `sips -g pixelWidth -g pixelHeight`; never resize.
9. Write the result (build number, upload status, folder) to `NATIVE-TEST-REPORT.md` and tell the owner: "Upload done. It appears in App Store Connect -> TestFlight in 5 to 30 minutes, first as Processing."

## C. Chrome Claude (browser) - App Store Connect

The long, ready-made prompt for creating the app record and filling the listing is `STORE-SETUP-PROMPT.md` (PHASE 3, steps 6 onward). What is left after the build is uploaded:

0. Pricing and Availability: China mainland is NOT ticked (owner, 15 Oct 2026: Apple asked for a book-publishing permit, 2.1).
1. Open appstoreconnect.apple.com -> Apps -> ReadFluent -> iOS App -> the 1.0 version page.
2. Build section: choose the newest build the Mac Claude uploaded (20261010 or later: portrait-only iPhone, the offline screen, no link previews), never 20261007 (wait for it to stop saying Processing). Answer the export-compliance question: "No" encryption beyond what Apple's OS provides (the app only uses HTTPS).
3. Screenshots: delete the old set and upload the six files from `~/Desktop/ReadFluent-screenshots-v2/` into the iPhone slot they fit (1284x2778 is the 6.5-inch size; the owner picks the files in the file chooser if you cannot).
4. In-App Purchases and Subscriptions section on the version page: add `readfluent_monthly` and `readfluent_yearly` to this version. Each subscription needs its review screenshot (a Premium window screenshot is right HERE, only here: it is never shown on the store page), review notes "Home -> round profile button (top right) -> Premium, or start a third book", and the localisation (display name "ReadFluent Monthly" / "ReadFluent Yearly", description "Every book, all levels"). The subscription group "ReadFluent Full" needs its display name too.
5. Age rating, App Privacy, Category (Education), Pricing (Free), Support URL, Privacy URL, Copyright, description and promotional text: as in STORE-SETUP-PROMPT.md (updated 15 Oct 2026: Name and Product Interaction in App Privacy; user-generated content and health topics in the age rating; no Talk anywhere while it is off; the description carries the subscription terms and the EULA link); check each page shows no red warning.
6. App Review Information: contact Aman Marwaha, aman66@hotmail.co.uk, phone as saved. Sign-in required: YES (sign-in became required on 6 Oct 2026). Demo account: recommended (Apple 2.1 asks for one whenever an app needs a login). To make one: in Supabase -> Authentication -> Users -> Add user, a review address the owner controls with a long password, "Auto confirm"; put the same address in Vercel `NEXT_PUBLIC_REVIEW_EMAILS` (Production) and redeploy; enter the address and password here. That account signs in with a password under "Use email instead" and is treated as Pro (`lib/auth/review.ts`, `lib/pro/state.ts`). Without one, the reviewer uses Sign in with Apple (any Apple ID). Paste the Notes below.
7. Version Release: "Manually release this version".
8. Stop before "Add for Review" / "Submit". Tell the owner every page is green and what is left.

### Notes for App Review (paste exactly; the bracketed line only when a demo account is set)

ReadFluent teaches languages by reading. An account is needed to read: on the first screen tap "Get started", answer the short questions, then at "Sign in or sign up" tap "Continue with Apple" (any Apple ID works).
[Or tap "Use email instead", type the demo address above, and sign in with the password. The demo account already has Pro.]

Subscription: the ReadFluent Pro screen appears once before the short tour (it can be closed). After that it opens when you start a third book (any 2 books are free), and any time from Home -> the round profile button at the top right -> Premium. The price, length, 7-day free trial, auto-renewal terms, Restore Purchases, and the Terms and Privacy links are all on that screen. Buying in the sandbox unlocks every book at once.

Account deletion: Home -> round profile button (top right) -> Delete account.

Native features: Sign in with Apple; subscriptions through StoreKit; Apple's on-device Translation framework turns a book into the language being learned (iOS 18 or later; the first time, iOS asks to download the language); system text-to-speech reads pages and words aloud; a native screen appears if the network is unavailable.

Content: the books are our own retellings of classic works, and new stories written by us for learners.

### Reply to Apple about the 14 Oct 2026 rejection (submission 7e3f3bf3-a281-4cb0-83a8-e72b9509084c)

Hello, and thank you for the review.
Guideline 2.3.7: we replaced every screenshot. None of them mentions a price, a free plan or a free trial now.
Guideline 2.1: we have removed China mainland from the countries and regions where the app is available, so no publication permit is needed.
We have also updated the review notes with how to sign in and where to find the subscription. Thank you.

## D. Things that can make Apple say no (and what we did)

- Guideline 2.3.7 (rejected 14 Oct 2026): no price, "free" or trial in screenshots, name, subtitle or promotional text. The description is the place for them.
- Guideline 2.1 China (rejected 14 Oct 2026): China mainland is not sold (it needs a publishing permit).
- Guideline 4.2 (minimum functionality / just a website): the app loads our site, so the review notes above list only native features that exist: Sign in with Apple, StoreKit, Apple's Translation framework, system text-to-speech, the native offline screen. Not offline reading (M9) and not speech recognition (the speaking questions are left out inside the app). Inside the app the page does not behave like a web page (no link preview, no text selection on controls, no page bounce: `app/globals.css`, "Inside the native app").
- Guideline 2.5.2 / 2.3.1: the app shows the live site, so keep production deploys small and in step with the review notes while a build is in review.
- Guideline 3.1.2 (subscriptions): price, length, auto-renewal, how to cancel, trial terms, Terms and Privacy links, and Restore are all in the Premium window.
- Guideline 5.1.1(v): account deletion is in Profile. It revokes the Sign in with Apple login only once APPLE_TEAM_ID, APPLE_SIWA_KEY_ID and APPLE_SIWA_PRIVATE_KEY are set in Vercel (`lib/auth/apple-revoke.ts`). Requiring an account to read is the remaining 5.1.1(v) risk (owner's decision, 6 Oct 2026).
- Guideline 1.2 (user-generated content: league display names): Terms forbid objectionable content, Report and Block are next to every real reader's name, and the Terms promise every report is looked at within 24 hours, so someone must read the support inbox daily.
- Guideline 4.8: Sign in with Apple is offered next to Google. A failed Apple or Google sign-in now says so under the buttons (a cancel says nothing).
- Age rating and privacy answers must match `/privacy`.
- If Apple rejects: copy the exact message to the cloud Claude; most fixes are quick and, because the app loads the live site, many need no new build.

## E. After "Approved"

1. The owner presses "Release this version" (manual release).
2. Check `/api/health`, the Premium window and a real purchase on a second Apple ID with a real card only if the owner wants to; otherwise sandbox is enough.

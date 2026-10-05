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
4. Privacy manifest: make sure the app target has `ios/App/App/PrivacyInfo.xcprivacy` (create it if missing, add it to the target): no tracking, `NSPrivacyAccessedAPITypes` for UserDefaults (reason CA92.1) and file timestamp (C617.1), and collected data types: email address, user ID, purchase history, other user content - all for App Functionality, linked to the user, not tracking.
5. App icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` must be 1024x1024 with NO transparency (flatten onto the cyan background if it has alpha).
6. Version 1.0, build number: set `CURRENT_PROJECT_VERSION` higher than anything uploaded before (1 if this is the first upload; otherwise +1).
7. Archive: Xcode -> scheme App -> destination "Any iOS Device (arm64)" -> Product -> Archive (or `xcodebuild -workspace/-project ... -scheme App -configuration Release archive`). Signing: automatic, team CLARIFO DEVELOPERS LTD. Then Distribute App -> App Store Connect -> Upload. If Xcode asks for the Apple ID or a 2FA code, stop and tell the owner which window to use.
8. Screenshots (needed for the store page): use the iPhone 16 Pro Max simulator (1320x2868) with the real app loaded, signed out, English interface, learning Spanish. Capture 6 screens with `xcrun simctl io booted screenshot ~/Documents/readfluent-store/screenshots/NN-name.png`: 01 home, 02 library, 03 a book page in Spanish with the coloured words, 04 a tapped word card, 05 Recall/flashcards, 06 the Premium window. No personal data in any of them. Tell the owner the folder.
9. Write the result (build number, upload status, folder) to `NATIVE-TEST-REPORT.md` and tell the owner: "Upload done. It appears in App Store Connect -> TestFlight in 5 to 30 minutes, first as Processing."

## C. Chrome Claude (browser) - App Store Connect

The long, ready-made prompt for creating the app record and filling the listing is `STORE-SETUP-PROMPT.md` (PHASE 3, steps 6 onward). What is left after the build is uploaded:

1. Open appstoreconnect.apple.com -> Apps -> ReadFluent -> iOS App -> the 1.0 version page.
2. Build section: click "Add Build", choose the build the Mac Claude uploaded (wait for it to stop saying Processing). Answer the export-compliance question: "No" encryption beyond what Apple's OS provides (the app only uses HTTPS).
3. Screenshots: upload the six files from `~/Documents/readfluent-store/screenshots/` into the 6.9-inch iPhone slot (the owner picks the files in the file chooser if you cannot).
4. In-App Purchases and Subscriptions section on the version page: add `readfluent_monthly` and `readfluent_yearly` to this version. Each subscription needs its screenshot (use the Premium window screenshot), review notes "Opens from Profile -> Premium", and the localisation (display name "ReadFluent Monthly" / "ReadFluent Yearly", description "Every book, all levels"). The subscription group "ReadFluent Full" needs its display name too.
5. Age rating, App Privacy, Category (Education), Pricing (Free), Support URL, Privacy URL, Copyright: already covered in STORE-SETUP-PROMPT.md; check each page shows no red warning.
6. App Review Information: contact Aman Marwaha, aman66@hotmail.co.uk, phone as saved. Sign-in required: NO. Paste the Notes below.
7. Version Release: "Manually release this version".
8. Stop before "Add for Review" / "Submit". Tell the owner every page is green and what is left.

### Notes for App Review (paste exactly)

ReadFluent teaches languages by reading. No account is needed: reviewers can read straight away. Pluto chat and cross-device saving need sign-in (Sign in with Apple, Google or email).
To see the subscription: open the Profile tab -> Premium. Subscriptions are sold through Apple in-app purchase (auto-renewing monthly and yearly, 7-day free trial for new subscribers). Restore Purchases is in the same window. Terms and Privacy links are in the window and in Profile.
Native features beyond a website: on-device translation of books with Apple's Translation framework (iOS 18+), speech recognition and microphone for the speaking tests, text-to-speech read-aloud, in-app purchases through StoreKit, and offline reading. Account deletion: Profile -> Delete account.
Books are the publisher's own retellings of public-domain works or new stories; none are copied from in-copyright books.

## D. Things that can make Apple say no (and what we did)

- Guideline 4.2 (minimum functionality / just a website): the app loads our site, so the review notes above list the native features; the build includes the translation, speech and StoreKit plugins.
- Guideline 3.1.2 (subscriptions): price, length, auto-renewal, how to cancel, trial terms, Terms and Privacy links, and Restore are all in the Premium window.
- Guideline 5.1.1(v): account deletion is in Profile.
- Guideline 4.8: Sign in with Apple is offered next to Google.
- Age rating and privacy answers must match `/privacy`.
- If Apple rejects: copy the exact message to the cloud Claude; most fixes are quick and, because the app loads the live site, many need no new build.

## E. After "Approved"

1. The owner presses "Release this version" (manual release).
2. Check `/api/health`, the Premium window and a real purchase on a second Apple ID with a real card only if the owner wants to; otherwise sandbox is enough.

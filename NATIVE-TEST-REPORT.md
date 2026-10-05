# Native test report (Mac)

6 Oct 2026. Mac: Xcode 26.6, Node 26.5, JDK 21 in `~/jdk21`. Branch `claude/readfluent-template-setup-ewq3lj`.

## Works
- `npm install`, `npm run typecheck`, `npm test` (one test, `identity.test.ts`, fails only on this Mac because it reads the gitignored local Spanish files in `scripts/apple-translate/work/es/`; it passes in a clean clone), `npm run check:native` (ok), `npx cap sync` (iOS and Android).
- iOS: builds and runs on the iPhone and on the iPhone 17 Pro simulator. The signed app carries the Sign in with Apple entitlement and its provisioning profile allows it.
- Android: debug APK and an unsigned release `.aab` build with JDK 21 (Android needs a signing key the owner types the password for; not made yet). Debug keystore SHA-1: `13:F0:22:A9:DD:32:12:85:B2:4D:D6:62:67:AC:79:5D:8B:64:90:B1`.
- Walked through the first run, home, tour, library, book page, reader (swipe, settings, quiz) in the simulator, and ~20 pages in the browser at phone width: no overflow, no leaked text keys.

## Fixed on the Mac
- `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` added to `Info.plist` (without them iOS ends the app when the microphone is asked for).
- `PrivacyInfo.xcprivacy` added to the app target (no tracking; email, user ID, purchase history, messages typed to Pluto; UserDefaults and file-timestamp reasons).
- App icon re-saved with no alpha channel (picture unchanged; Apple rejects icons with one).
- Build number set to a date, 20261006, so it is higher than any earlier upload.
- Inside the installed app the "Add me to your home screen" step is skipped; the reader's "download the language" screen has a "Back to the book" link.

## Uploaded
- 6 Oct 2026 03:31 (Mac time): ReadFluent 1.0, build 20261006, uploaded to App Store Connect (TestFlight) from the Release archive, signed under CLARIFO DEVELOPERS LTD (S7G6ZHHK59). Not submitted for review. The first upload attempt was refused by Apple (error 90158) for a placeholder Google URL scheme in `Info.plist`; removed, and the second upload succeeded.
- Apple's processing takes about 5 to 30 minutes; the build then appears under TestFlight as "Processing", then ready.

## Needs a real iPhone (the simulator cannot)
- Apple's on-device translator: Download Spanish, then open a book and tap a word (word card).
- The quiz's "Siguiente" button: in the simulator it only responded when tapped below where it is drawn (answer buttons were exact). Could be a simulator quirk or a real hit-area bug.
- Listen, the speaking test, sign-in, the paywall with real store prices.

## Known and left alone
- Speech recognition: WKWebView has no web SpeechRecognition; the Capacitor speech plugin is not added yet (the cloud Claude owns `lib/reading/listen.ts`).
- The APK is 73 MB because ML Kit's translator library is included for four CPU types; a Play bundle splits it.

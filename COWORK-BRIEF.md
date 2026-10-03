# Brief for Claude Cowork (computer use on the owner's Mac)

Paste everything inside the block into Cowork. It works through the list in order and stops at the marked moments.

```
You are helping me (the owner) finish my app ReadFluent: set up the stores, the in-app purchases, the translator,
and build the iPhone and Android apps. You control my Mac. Report progress to me in short plain lines.

GOLDEN RULES (these beat everything else)
1. STOP and ask me before: paying or adding a card, accepting ANY agreement/contract/terms, tax or banking forms,
   anything that asks for my password, 2FA code or identity check, submitting anything for App Review or publishing
   anything to the public, deleting anything, or changing anything that is not ReadFluent.
2. Secrets (API keys, .p8/.json key files, keystore passwords, tokens): never show them in chat, never read them
   out, never put them in git or any file inside ~/Projects/readfluent. Move them only by copy/paste or file upload
   straight into the box that needs them. Keep key files in ~/Documents/readfluent-keys/ (create it).
3. Do NOT touch any app or project that is not named ReadFluent (Supabase, RevenueCat, Google Cloud, Vercel,
   App Store Connect all hold other apps of mine). Only ReadFluent.
4. Do NOT edit the app's code and do NOT git commit or push. The code is handled by my other Claude. If the build
   needs a code change, write down exactly what and why, and carry on with the next task.
5. If something fails twice, write down the exact error and move to the next task. At the end give me one list:
   DONE / WAITING FOR ME / PROBLEMS.

FACTS
  Repo on this Mac: ~/Projects/readfluent (branch claude/readfluent-template-setup-ewq3lj). Run `git pull` first.
  App name ReadFluent. Bundle ID / Android package: com.amanmarwaha.ReadFluent
  Apple team: CLARIFO DEVELOPERS LTD, Team ID S7G6ZHHK59. Sign in with Apple is already set up.
  Website: https://readfluent-eta.vercel.app  (privacy /privacy, terms /terms, support /support)
  Store text, screenshots and answers: read ~/Projects/readfluent/STORE-SETUP-PROMPT.md (Phases 3 and 4).
  Google Cloud project: readfluent (id readfluent-510418). Vercel project: readfluent.
  RevenueCat project: ReadFluent (app.revenuecat.com/projects/e68b9824). Entitlement readfluent_pro, offering default.
  Subscriptions: readfluent_monthly = 1 month GBP 5.99 ; readfluent_yearly = 1 year GBP 39.99.
  On Google Play the base plans are p1m (monthly) and p1y (yearly).

TASK 1 - SKIPPED (owner, 3 Oct 2026: books are translated on the phone itself, free). Do not create a Google
  translator key. The old instructions are kept below only for reference.
TASK 1 (not to do) - Translator key
  Google Cloud console, project readfluent: enable "Cloud Translation API" (if it needs billing: STOP for me).
  Quotas: set "Characters per day" (v2) as low as allowed, aim 15000. Billing -> Budgets: 1 GBP/month alert to my email.
  Credentials -> Create API key "readfluent-translate", restrict to Cloud Translation API only.
  Vercel -> readfluent -> Settings -> Environment Variables: add GOOGLE_TRANSLATE_API_KEY = that key, Production and
  Preview, Sensitive. Then Deployments -> latest Production -> Redeploy. Check https://readfluent-eta.vercel.app/api/health
  shows "translator": true.

TASK 2 - App Store Connect app record and listing
  Do STORE-SETUP-PROMPT.md Phase 3 (create the app, App Information, pricing Free, App Privacy, age rating, version
  1.0 text, screenshots from https://readfluent-eta.vercel.app/store/ios-1-home.png ... ios-5-recall.png, review notes).
  STOP before submitting.

TASK 3 - In-app purchases on Apple
  App Store Connect -> the ReadFluent app -> Subscriptions: create group "ReadFluent Full" with readfluent_monthly
  (1 month, GBP 5.99) and readfluent_yearly (1 year, GBP 39.99), English display names "ReadFluent Monthly"/"ReadFluent
  Yearly", description "Unlock every book at every length." If it says the Paid Applications Agreement, tax or banking
  is needed: STOP for me.
  Users and Access -> Integrations -> In-App Purchase: generate a key named "RevenueCat", download the .p8 into
  ~/Documents/readfluent-keys/, note its Key ID and the Issuer ID.
  RevenueCat -> ReadFluent -> Apps -> add App Store app "ReadFluent iOS", bundle id as above, upload that .p8 with its
  Key ID and Issuer ID. Then add products readfluent_monthly and readfluent_yearly to it, attach both to entitlement
  readfluent_pro, and add them to the default offering's Monthly ($rc_monthly) and Annual ($rc_annual) packages.
  Tell me the iOS PUBLIC SDK key (starts appl_) - public keys are fine to show; never show keys starting sk_.

TASK 4 - Build the iPhone app and put it on TestFlight
  Terminal: cd ~/Projects/readfluent && git pull && npm install && npx cap sync ios
  Open ios/App/App.xcodeproj in Xcode. Target App -> Signing & Capabilities: Automatically manage signing, Team
  CLARIFO DEVELOPERS LTD, bundle id com.amanmarwaha.ReadFluent; make sure "Sign in with Apple" and "In-App Purchase"
  capabilities are present. Version 1.0, Build 1.
  Product -> Archive (destination Any iOS Device). Organizer -> Distribute App -> App Store Connect -> Upload.
  When processed, App Store Connect -> TestFlight: add me as an internal tester. Tell me when I can install it.

TASK 5 - Google Play Console app and listing
  If I have no Google Play developer account, STOP and tell me (it costs a one-time fee and needs ID checks).
  Do STORE-SETUP-PROMPT.md Phase 4 (create the app, the dashboard declarations - ask me before each legal one -,
  content rating, data safety, target audience, store listing with the /store/ images). STOP before any release
  goes to production.

TASK 6 - Build the Android app and put it on Internal testing
  Install Android Studio from developer.android.com if it is missing (it includes Java). Open ~/Projects/readfluent/android.
  Terminal: cd ~/Projects/readfluent && npx cap sync android
  Build -> Generate Signed App Bundle -> create a NEW upload keystore saved in ~/Documents/readfluent-keys/ (NOT in the
  repo). Ask me to type the keystore password myself and tell me to store it in my password manager; I must never lose it.
  Build the release .aab. Play Console -> Testing -> Internal testing -> create release -> upload the .aab (Play App
  Signing: ask me before accepting). Add me as a tester. Then Monetize -> Subscriptions: readfluent_monthly with base
  plan p1m (GBP 5.99, auto-renew monthly) and readfluent_yearly with base plan p1y (GBP 39.99, yearly); activate them.

TASK 7 - Google Play purchases for RevenueCat
  Follow RevenueCat's guide "Google Play service credentials": create a service account in Google Cloud project
  readfluent, invite it in Play Console -> Users and permissions with the financial/order permissions RevenueCat lists,
  create its JSON key into ~/Documents/readfluent-keys/, upload it to RevenueCat -> ReadFluent Android. Check that
  RevenueCat shows the two Android products as found (it can take up to a day; just report the status).

FINISH: give me DONE / WAITING FOR ME / PROBLEMS, plus the appl_ public key and anything my coding Claude must change.
```

# The big Claude-in-Chrome prompt: Apple sign-in, App Store Connect and Google Play Console

Paste the block below into Claude in Chrome. Log in to developer.apple.com, appstoreconnect.apple.com,
play.google.com/console, supabase.com and github.com yourself first. It stops at every login, agreement, payment
and secret. The terminal step for Apple is described in the block.

```
You are helping me prepare my app ReadFluent for Sign in with Apple, the Apple App Store and Google Play.
Work in the browser, one phase at a time, and after each step tell me in one short line what you did.

GLOBAL RULES (these beat everything else)
- If any page asks me to log in, do 2FA, verify identity, add a card, pay, or accept an agreement, contract,
  tax or banking form: STOP, tell me what it is, and wait for my clear "yes". Never accept for me.
- Never type, paste, read out or store a secret (keys, passwords, tokens, .p8 contents). When a secret has
  to go into a box, leave the box empty and visible and tell me to paste it myself.
- Touch only the things named here. Do not change, delete or open any other app, project, team, certificate
  or setting. Do not submit anything for review and do not publish anything to the public: stop before that.
- If something is unclear, a field is missing, or a name is taken: do the safest thing, write down the
  problem, and carry on; list every problem at the end. Never invent facts I did not give you.
- The people who made the app are "me". Facts below are the only facts.

FACTS
  App name: ReadFluent         Tagline: Stories at your level.
  Bundle ID (Apple) and package name (Android): com.amanmarwaha.ReadFluent
  Apple Services ID: com.amanmarwaha.ReadFluent.web
  Website: https://readfluent-eta.vercel.app
  Privacy policy URL: https://readfluent-eta.vercel.app/privacy
  Terms URL: https://readfluent-eta.vercel.app/terms
  Support URL: https://readfluent-eta.vercel.app/support
  Supabase project ref: erilcjzbnomgxhjnurce  (URL https://erilcjzbnomgxhjnurce.supabase.co)
  Category: Education (primary), Books (secondary on Apple). Free to download; a free account reads any 2 books.
  ReadFluent Pro (auto-renewing, ReadFluent Monthly 5.99 GBP or ReadFluent Yearly 39.99 GBP, 7-day free trial for new
  subscribers; entitlement readfluent_pro) opens every book. Never put a price, "free" or a trial in screenshots,
  the app name, subtitle or promotional text (Apple 2.3.7); the description is the one place for them.
  Audience: teenagers and adults (13+). Not aimed at children.
  What the app is: classic books retold at a learner's level (A1 to C2), plus original stories written for
  learners, read one page at a time with a picture and 1-3 sentences; tap any word for its meaning, a short
  quiz every 5 pages, flashcards, tests, level exams, friends and a weekly league. The app interface is in 20
  languages. Talk (an AI conversation with Pluto) is built but switched OFF: do not mention it anywhere in a
  listing, privacy answer or rating until the owner switches it on.
  Data: an account is required to use the app (sign in with Apple or Google; the emailed code cannot be sent
  until custom email is set up). Progress, words and flashcards are kept on the phone. The account holds: email
  address, the name the provider shares, a user ID, the answers from the first run, Pro status, and the
  friends/league profile (display name, username, level, streak, XP) that other readers see. Books are translated
  on the phone itself; nothing is sent for that. The first-run answers are kept with the account for our own
  statistics. No ads, no third-party analytics, no tracking, no data sold. Account deletion:
  in the app under Profile (the round button at the top right of Home), or via the Support page.

PHASE 1 - Apple Developer (developer.apple.com -> Account -> Certificates, Identifiers & Profiles)
1. Identifiers -> "+" -> App IDs -> App. Description "ReadFluent", Bundle ID Explicit
   com.amanmarwaha.ReadFluent. Tick capability "Sign in with Apple". Continue, Register.
   (If it already exists, open it and make sure Sign in with Apple is ticked.)
2. Identifiers -> "+" -> Services IDs. Description "ReadFluent web", identifier
   com.amanmarwaha.ReadFluent.web. Register. Open it, tick "Sign in with Apple", press Configure:
     Primary App ID: ReadFluent.
     Domains and Subdomains: erilcjzbnomgxhjnurce.supabase.co   (no https://)
     Return URLs: https://erilcjzbnomgxhjnurce.supabase.co/auth/v1/callback
   Save, Continue, Save.
3. Keys -> "+" -> name "ReadFluent sign in". Tick "Sign in with Apple", Configure, choose the ReadFluent
   App ID, Save, Continue, Register, and DOWNLOAD the .p8 file (Apple allows it once). Do not open it.
4. Tell me: my Team ID, the Key ID, and the downloaded file's name. Then STOP and say exactly:
   "Phase 1 done. Now do the terminal step (below), then tell me you have the long text copied."
   TERMINAL STEP, for me to do: open Claude Code on my own computer in the readfluent folder and say:
   "Run node scripts/apple-client-secret.mjs <TEAM_ID> <KEY_ID> com.amanmarwaha.ReadFluent.web
   ~/Downloads/<file name> and copy only the output to my clipboard with pbcopy. Do not print it and do not
   commit the .p8 file."

PHASE 2 - Supabase Apple provider (after I say I copied the long text)
5. Open https://supabase.com/dashboard/project/erilcjzbnomgxhjnurce/auth/providers , open "Apple", turn it
   ON. Client IDs box: com.amanmarwaha.ReadFluent.web,com.amanmarwaha.ReadFluent . Leave "Secret Key (for
   OAuth)" empty and visible. STOP and tell me: "Paste the long text into the Secret Key box and press Save."
   When I say done, confirm Apple shows Enabled. Do NOT touch Vercel; I will switch the button on myself.

PHASE 3 - App Store Connect (appstoreconnect.apple.com -> Apps). Create the record, fill everything, stop.
6. "+" -> New App. Platform iOS. Name "ReadFluent" (if taken use "ReadFluent: Learn by Reading"). Primary
   language English (U.K.). Bundle ID: choose com.amanmarwaha.ReadFluent from the list (if it is not listed,
   STOP and tell me). SKU "readfluent-ios". User Access: Full Access. Create.
7. App Information: Subtitle "Learn languages by reading". Category Primary: Education. Secondary: Books.
   Content rights: "Yes, it contains third-party content" and "Yes, I have the necessary rights" (the books
   are our own retellings of classic works, and original stories we wrote; one classic, The Richest Man in Babylon,
   is still in copyright in the UK and EU until 2028: the owner decides whether to keep it).
   Privacy Policy URL as above.
8. Pricing and Availability: Price Free (tier 0). Availability: all countries and regions I am allowed to
   choose EXCEPT China mainland (it needs a book-publishing permit; owner, 15 Oct 2026). Do not enable pre-orders.
9. App Privacy: Privacy Policy URL as above. Answer the questionnaire from the DATA facts only:
   Data collected: Contact Info -> Email Address and Name (linked to user, used for App Functionality);
   Identifiers -> User ID (linked, App Functionality); Usage Data -> Product Interaction (level, streak and XP for
   the league; linked, App Functionality); User Content -> Other User Content (display name and username other
   readers see, and reports; linked, App Functionality); Other Data -> Other Data Types (the first-run answers:
   why they learn, where they heard of us, languages, level, interests; linked, Analytics). Purchases -> Purchase
   History (linked, App Functionality),
   because the subscriptions are sold through Apple and checked by RevenueCat. Nothing is used for tracking. No
   third-party advertising.
   Then compare your answers to https://readfluent-eta.vercel.app/privacy and tell me about any mismatch.
10. Age Rating questionnaire: answer honestly for a reading app of classic literature retellings:
    violence, horror/fear themes, alcohol/tobacco references and mature themes = "Infrequent/Mild" (the
    books include things like detective stories and gothic classics); health or wellness topics: Yes, and medical or
    treatment information: Infrequent/Mild (there are health books); user-generated content: Yes (display names in
    the league); messaging: No; everything else None; no gambling; no unrestricted web access; AI chatbot: No while
    Talk is switched off (Yes once it is on). The minimum must be 13+.
    Report the resulting age rating to me.
11. Version "1.0" page (iOS App): 
    Promotional Text: Classic books and new stories, retold at your level. Read one short page at a time, tap any word to see what it means, and watch your language grow.
    Keywords (max 100 chars): language learning,reading,graded readers,books,stories,vocabulary,flashcards,CEFR,Spanish,French
    Support URL: https://readfluent-eta.vercel.app/support  Marketing URL: https://readfluent-eta.vercel.app
    Copyright: 2026 CLARIFO DEVELOPERS LTD
    Description (paste exactly):
      ReadFluent teaches you a language by reading.

      Pick your level, from A1 beginner to C2 advanced. Every book is retold for that level, one short page at a
      time: a picture and one to three sentences. Tap any word to see what it means in that sentence, hear it, and
      save it to your flashcards.

      WHAT YOU GET
      - Classic books retold at your level, plus new stories written for learners: mysteries, romance, adventure,
        science, self-help and more
      - One short page at a time, so it fits into a few minutes a day
      - Tap any word for its meaning, and save it as a flashcard
      - A short quiz every five pages on the words you have just met
      - Phrase decks, tests and level exams that show how far you have come
      - XP, streaks, achievements and a weekly league with friends
      - The whole app in 20 languages
      - Books open in the language you are learning using your iPhone's own translator (iOS 18 or later)

      An account is needed to read: sign in with Apple or Google in a few seconds.

      FREE AND PRO
      ReadFluent is free to download, and a free account can read any 2 books in full. ReadFluent Pro opens every
      book. It is an auto-renewing subscription, monthly or yearly, with a 7-day free trial for new subscribers.
      Payment is charged to your Apple ID account when you confirm the purchase, or when the free trial ends. The
      subscription renews automatically unless it is cancelled at least 24 hours before the end of the current
      period, and your account is charged for the renewal within 24 hours before the period ends. You can manage or
      cancel it at any time in your App Store account settings.

      Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
      Our terms: https://readfluent-eta.vercel.app/terms
      Privacy Policy: https://readfluent-eta.vercel.app/privacy
    What's New: First release.
12. Screenshots: the six taken on the Mac (1284x2778, the iPhone 6.5-inch slot, 1_home to 6_quiz, folder
    ~/Desktop/ReadFluent-screenshots-v2; the owner picks the files). None may show a price, "free", a trial
    or a Premium/subscription screen (Apple 2.3.7 rejected build 20261007 for that).
    App icon (1024x1024) is part of the app build, so skip it.
13. App Review Information: Sign-in required: YES. Demo account: see APP-STORE-SUBMISSION.md (C.6); without
    one the reviewer signs in with Sign in with Apple, which works with any Apple ID. Notes: paste the
    "Notes for App Review" from APP-STORE-SUBMISSION.md. Contact name/phone/email: ask me. 
14. STOP before "Add for Review" / Submit. Do not upload a build (there is none yet).

PHASE 4 - Google Play Console (play.google.com/console). Create the app, fill everything, stop.
15. Create app: name "ReadFluent: Learn by Reading", default language English (United Kingdom), App (not
    game), Free, then confirm the declarations ONLY after asking me (they are legal statements).
16. Dashboard tasks (do each one that does not need a build):
    - Privacy policy URL as above.
    - App access: all functionality needs an account (sign in with Google). Give the review sign-in details if the
      owner has set a reviewer account (see APP-STORE-SUBMISSION.md C.6); otherwise ask me.
    - Ads: No, the app contains no ads.
    - Content rating: category Reference/Education; answer the IARC questionnaire honestly (infrequent
      mild violence and fear in classic books; no gambling; readers can see each other's display names in
      the league (user interaction: yes); no AI chat while Talk is switched off). Report the rating.
    - Target audience: 13+ only (not 5-12, not under 5, not "appeals to children").
    - Data safety: collects Name, Email address, User IDs, App interactions (level, streak, XP), Other
      user-generated content (display name) and Other info (first-run answers, for analytics); data is encrypted in transit; users can request deletion (URL
      https://readfluent-eta.vercel.app/support, and in-app Profile); data is NOT sold; not shared with third
      parties (Supabase, Vercel and RevenueCat process it for us; add Anthropic only once Talk is switched on).
    - Government apps: No. Financial features: none. Health: none. News app: No.
17. Store listing (Main store listing):
    Short description (80 chars): Learn a language by reading stories retold at your level, one page at a time.
    Full description: use the same text as the App Store description above.
    App icon 512x512: https://readfluent-eta.vercel.app/store/icon-512.png
    Feature graphic 1024x500: https://readfluent-eta.vercel.app/store/feature-graphic.png
    Phone screenshots: https://readfluent-eta.vercel.app/store/android-1-home.png to android-5-recall.png
    Category: Education. Tags if offered: Education, Language learning. Contact email: ask me which to show
    publicly. Website: https://readfluent-eta.vercel.app
18. Note for me: new personal Play accounts must run a closed test with 12 testers for 14 days before
    production access. Tell me if the console says this applies. STOP before creating any release;
    do not upload a bundle (there is none yet).

FINAL REPORT
List, in two short lists: what is now filled in on Apple, Google (names only, no secrets), and every
problem, missing item, question and agreement that is waiting for me. Say clearly that nothing has been
submitted for review or published.
```

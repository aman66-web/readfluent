# Switching on everything that needs an account: Supabase, Google and Apple sign-in, and the translator

> **The translator is not used** (owner, 3 Oct 2026): books are translated on the phone itself, free. In prompt 2 skip
> steps 6, 7 and 10 and the `GOOGLE_TRANSLATE_API_KEY` line; `"translator"` in the health check stays `false`, and that is right.

Three prompts, to be run in this order. Each one is for **Claude in Chrome** (the browser agent): log in to
the sites it names yourself first, then paste the prompt. When a prompt says "STOP", it will stop and ask you:
that is on purpose. Nothing here puts a secret key in a chat; the keys go from one website straight into
another.

What you need to have, before you start:

| For | You need |
| --- | --- |
| Supabase (accounts, saved progress) | A free account at supabase.com, logged in in Chrome. |
| Google sign-in | The Google account that will own the app, logged in at console.cloud.google.com. |
| Translator (books in the language you are learning) | The same Google account; Google asks for a card, and the first 500,000 characters a month are free. A book costs about 1 dollar the first time somebody opens it in a new language, then nothing. |
| Apple sign-in | An Apple Developer Program membership (99 dollars a year) at developer.apple.com. **Without it, skip prompt 3**: the app works without Apple sign-in on the web. The App Store, later, will insist on it once Google sign-in is offered. |
| Vercel | Logged in in Chrome; the project is the one at readfluent-eta.vercel.app. |

---

## Prompt 1: Supabase

Use the prompt in **SUPABASE.md, Part 1** exactly as it is (it creates the project, runs
`supabase/setup.sql`, turns on anonymous sign-ins and the emailed code, sets the redirect URLs and puts the three
Supabase keys into Vercel). When it ends, `https://readfluent-eta.vercel.app/api/health` must say `"ok": true`.

---

## Prompt 2: Google sign-in and the translator

```
I need you to set up Google sign-in and a translator key for my app ReadFluent. Work in the browser, step by
step, and tell me what you did at each step. Rules: if a page asks me to log in, do 2FA, verify anything, add a
card or pay, STOP and tell me - do not guess or work around it. Touch only what is named below: do not change,
delete or open any other project, app, team or setting. Never type or say a secret out loud in your messages:
when you must show me one, say only "present" and its first 4 characters. Never put a secret anywhere except
the field this prompt names.

PART A - Google Cloud (console.cloud.google.com)
1. Create a NEW project called "readfluent" (no organisation if it asks). Make sure it is the selected project
   at the top of the page for every step below.
2. APIs & Services -> OAuth consent screen (or "Google Auth Platform" -> Branding). User type: External.
   App name: ReadFluent. Support email and developer email: mine (the signed-in account). Authorized domain:
   vercel.app is not allowed as a domain, so leave domains empty. Save.
3. Then "Audience" (or "Publishing status"): press "Publish app" / "In production" so that anybody, not
   only test users, can sign in. If Google says it needs verification for the scopes, tell me which scopes:
   only the defaults (email, profile, openid) should be listed. Do not add other scopes.
4. APIs & Services -> Credentials -> Create credentials -> OAuth client ID. Application type: Web application.
   Name: "ReadFluent web". Authorized redirect URIs: add exactly
       https://<SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback
   where <SUPABASE-PROJECT-REF> is the first part of my Supabase Project URL (open supabase.com -> my
   "readfluent" project -> Project Settings -> API to read the URL; it looks like https://abcdefgh.supabase.co).
   Create. Keep the Client ID and Client secret on screen; do not repeat them to me.
5. In a new tab: supabase.com -> my "readfluent" project -> Authentication -> Sign In / Providers -> Google.
   Turn it ON. Paste the Client ID and the Client secret from step 4 into their fields. Save.
6. APIs & Services -> Library -> search "Cloud Translation API" -> Enable. (If it asks for billing, STOP and tell
   me: I will add a card myself.)
7. APIs & Services -> Credentials -> Create credentials -> API key. Name it "readfluent-translate".
   Edit the key: under "API restrictions" choose "Restrict key" and tick only "Cloud Translation API". Save.
   Keep the key on screen; do not repeat it to me.
8. Vercel (vercel.com) -> the ReadFluent project (production URL https://readfluent-eta.vercel.app) -> Settings ->
   Environment Variables. Add, for Production AND Preview:
       GOOGLE_TRANSLATE_API_KEY  = the key from step 7   (mark Sensitive)
       NEXT_PUBLIC_AUTH_GOOGLE   = 1
   Then Deployments -> the latest Production deployment -> Redeploy, and wait until it says Ready
   (these values are only read when the app is built).

PART B - Check it
9. Open https://readfluent-eta.vercel.app/welcome?step=account in a private window. A "Continue with Google"
   button should be there. Press it, pick my Google account, and tell me where I land (it should come back to
   the app, not to an error page). If you see "redirect_uri_mismatch" the redirect URI in step 4 is wrong; if
   you see "Unsupported provider" step 5 was not saved. Tell me which.
10. Open a book in the app after choosing Spanish as the language I am learning: it should say "Translating this
    book into Spanish..." for a few seconds and then show Spanish text. Tell me what you see.

Finish by listing what you created (names only, never keys) and anything that did not work.
```

---

## Prompt 3: Apple sign-in (only if you have the paid Apple Developer membership)

Apple's secret is a signed token, not a password, and it has to be made on a computer with the key file. So this
one has a small step for you in the middle.

**Step you do yourself, after the browser has made the key (Part A below):** open a Claude Code session in this
repository (or any terminal with Node installed) and run

```
node scripts/apple-client-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <path to the downloaded AuthKey_XXXX.p8>
```

It prints one long line. That line is what Supabase calls the "Secret Key". It stops working after 180 days:
put a reminder in your calendar to make a new one and paste it into Supabase again. Never commit the `.p8`
file, never paste its contents into a chat.

```
I need you to set up Sign in with Apple for my app ReadFluent. Work in the browser, step by step, and tell me
what you did at each step. Rules: if a page asks me to log in, do 2FA, verify anything or pay, STOP and tell me.
Touch only what is named below. Never type or say a secret out loud in your messages.

PART A - Apple (developer.apple.com -> Account -> Certificates, Identifiers & Profiles)
1. Identifiers -> "+" -> App IDs -> App. Description "ReadFluent". Bundle ID (Explicit): the one in
   lib/brand.ts of https://github.com/aman66-web/readfluent (branch claude/readfluent-template-setup-ewq3lj),
   field BUNDLE_ID. Capabilities: tick "Sign in with Apple". Continue, Register.
2. Identifiers -> "+" -> Services IDs. Description "ReadFluent web". Identifier: the bundle ID with ".web" added
   at the end. Register. Then open it, tick "Sign in with Apple", press Configure:
     Primary App ID: the App ID from step 1.
     Domains and Subdomains: <SUPABASE-PROJECT-REF>.supabase.co  (no https://)
     Return URLs: https://<SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback
   Save, Continue, Save. (My Supabase project ref is the first part of my Supabase Project URL.)
3. Keys -> "+" -> name "ReadFluent sign in". Tick "Sign in with Apple", Configure, choose the App ID from
   step 1, Save, Continue, Register, and DOWNLOAD the .p8 file (Apple lets me download it only once). Tell me the
   Key ID, the Services ID and my Team ID (top right of the page, or Membership details), and where the file
   was saved. Do not open the file.
4. STOP here and tell me to run the one command above. Wait for me to paste the long line it prints.

PART B - Supabase and Vercel
5. supabase.com -> my "readfluent" project -> Authentication -> Sign In / Providers -> Apple. Turn ON.
   Client IDs: the Services ID from step 2 (and, after a comma, the App ID's bundle ID).
   Secret Key (for OAuth): the long line I pasted. Save.
6. Vercel -> the ReadFluent project -> Settings -> Environment Variables: add NEXT_PUBLIC_AUTH_APPLE = 1 for
   Production AND Preview. Redeploy the latest Production deployment and wait until it says Ready.

PART C - Check it
7. Open https://readfluent-eta.vercel.app/welcome?step=account in a private window. A "Continue with Apple"
   button should be there; press it and tell me where I land. "invalid_client" means the secret is wrong or
   its Services ID does not match; "Unsupported provider" means step 5 was not saved.

Finish by listing what you created (names only, never keys) and anything that did not work.
```

---

## When it is all done

`https://readfluent-eta.vercel.app/api/health` should show `"ok": true`, `"db": true`, `"service": true` (`"translator"` stays `false`: not used), with
nothing under `missing`. The sign-in screen then offers Google (and Apple, if you did prompt 3) next to the
emailed code, and every book opens in the language you are learning.

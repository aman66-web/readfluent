# ReadFluent

Real books. Your level. A mobile reading app where people learn a language by
reading real books, retold at their level (A1–A2, B1–B2, C1–C2) and at the length
they choose (50, 100 or 200 pages), one page at a time: a photo and about 30 words.

- **What it is and the order it's built in:** [SPEC.md](SPEC.md)
- **How to work in this repo:** [CLAUDE.md](CLAUDE.md)
- **Calls made where the spec was ambiguous:** [DECISIONS.md](DECISIONS.md)

The engineering underneath (auth, purchases, offline shell, native wrapper) is
adapted from another app; the product, content and identity are new.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `NEXT_PUBLIC_SUPABASE_URL` set the app runs
in **local mode**: one reader, no sign-in, everything kept in the browser.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run check:native        # the native bundle is a thin shell (CLAUDE.md)
npm run build
./scripts/prove-sql.sh      # the migrations, against a real PostgreSQL 16 (needs root + postgres 16)
```

`npm run icons` regenerates every icon and splash from `public/icon.svg`.

## The whole thing, later

```bash
cp .env.example .env.local     # then fill in what you need
```

Nothing is shared with any other app: ReadFluent has its own Supabase project,
Vercel project, RevenueCat app and store keystores.

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the URL and anon key from Settings → API into `.env.local`, and the
   service role key into `SUPABASE_SERVICE_ROLE_KEY` (server-only — it bypasses
   row level security, so it must never get a `NEXT_PUBLIC_` prefix).
3. Authentication → Providers → Email: turn on **Allow anonymous sign-ins**
   (every new visitor gets a temporary anonymous session so the first screens work; it opens nothing else, because signing in is required: `lib/auth/gate.ts`).
4. Run every file in `supabase/migrations/` in order, in the SQL editor. Then
   paste `supabase/checks/plan_guard.sql`: every column must come back `t`.
5. Deploy to Vercel and set the same variables there. `NEXT_PUBLIC_` values are
   inlined at build time, so a changed one needs a redeploy. `/api/health`
   reports what the server has; `/health` reports what the browser's bundle was
   built with.

## Sending the sign-in code

Email sign-in is a six-digit code, not a link — no password, nothing to click,
which is also why it works the same inside a store build as on the web.
Supabase's templates don't include the code by default:

1. **Supabase → Authentication → Email Templates → Magic Link.**
2. Replace the body so it shows `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.
3. Before real users, set **Project Settings → Auth → SMTP Settings** to a real
   sender (Resend, Postmark, ...): the built-in sender is rate limited.

## Google and Apple sign-in

Off by default, because Supabase gives the browser no way to ask which providers
a project has enabled — a button shown before its provider is set up leaves for
Google and comes back with "Unsupported provider". Three places have to agree.

The URL everything hangs off is Supabase's, not the app's:
`https://<project-ref>.supabase.co/auth/v1/callback`. That goes into Google's and
Apple's consoles. The app's own `/auth/callback` is where Supabase sends the
browser afterwards (step 3).

1. **Google.** Cloud Console → OAuth consent screen (External; publish it, or
   only listed test users can sign in) → Credentials → OAuth client ID, type Web
   application, redirect URI as above. Put the Client ID and secret into
   Supabase → Providers → Google. For the native Google sheet, also make an
   **iOS** client ID and put both IDs in `lib/auth/google.json`; add the iOS
   ID **reversed** (`com.googleusercontent.apps.<id>`) as a URL scheme in
   `ios/App/App/Info.plist` (a placeholder is there).
2. **Apple.** Needs a paid Developer Program membership and a deployed URL
   (Apple rejects `localhost`). Make an App ID (the bundle id, with Sign in with
   Apple ticked), a Services ID for the web, and a key (`.p8`, downloadable
   once). Apple's client secret is a JWT signed with that key and **expires in at
   most six months — sign-in breaks the day it does**, so calendar it.
3. **Supabase → Authentication → URL Configuration.** Site URL: your production
   origin. Redirect URLs: `https://<origin>/auth/callback`,
   `http://localhost:3000/auth/callback`, and `readfluent://auth/callback` for
   the store builds (one entry for both platforms).
4. **Turn the buttons on** with `NEXT_PUBLIC_AUTH_GOOGLE=1` and/or
   `NEXT_PUBLIC_AUTH_APPLE=1`, then redeploy. Only the provider you have finished.

Sign in with Apple is **mandatory** in an App Store build the moment Google
sign-in is offered (Guideline 4.8).

| What you see | What it means |
| --- | --- |
| No buttons | The `NEXT_PUBLIC_AUTH_…` flag is unset, or set after the last build. |
| "Unsupported provider" | The flag is on but the provider is off in Supabase. |
| `redirect_uri_mismatch` at Google | The redirect URI is the app's, not Supabase's. |
| "invalid_client" at Apple | The secret JWT has expired, or `sub` is the App ID rather than the Services ID. |
| Signs in, lands on `/?error=auth` | The origin is missing from Redirect URLs, or the code was stale. |

## RevenueCat webhook

Once the products exist in App Store Connect / Google Play and RevenueCat has an
entitlement with id **`readfluent_pro`** with both attached (the id must match
`lib/purchases/entitlement.ts` exactly):

1. RevenueCat → Project settings → Integrations → Webhooks → add
   `https://<your origin>/api/revenuecat/webhook`, with an Authorization header
   value that is a long random string you make up.
2. Set `REVENUECAT_WEBHOOK_SECRET` to that same string, and
   `NEXT_PUBLIC_REVENUECAT_IOS_KEY` / `…_ANDROID_KEY` to the public API keys.

Every event carrying the entitlement writes `plan = 'full'` and
`plan_until = <new expiry>` onto that reader's `public.users` row, keyed by
RevenueCat's app user id — always the same uuid as their Supabase user id
(`lib/purchases/native.ts`), so no mapping table. Only the server may write that
column (`0002_plan.sql`). What the plan opens is `lib/plan.ts` and nowhere else.

Check it: "Send test event" in RevenueCat should log a `200` (a test event's user
id isn't real, so nothing changes — that's expected). A real sandbox purchase
should show `plan: 'full'` on the tester's row within seconds.

## Building for the App Store and Google Play (Capacitor)

The website and the store apps are the same code, wrapped. `capacitor.config.ts`
points a real native shell at the live deployed site (`server.url`) because the
app is not static — sign-in, account deletion and the webhook need a server. The
books are not in the app either: content is fetched from storage, so the install
is a thin shell. **`webDir` is `native-shell/`, never `public/`**, and
`.capacitorignore` lists the content and media types; `npm run check:native`
fails if either is wrong.

Google won't complete sign-in inside an embedded WebView, so on both native
builds Google and Apple open in the system browser and come back through the
`readfluent://` scheme (`ios/App/App/Info.plist`, `android/app/src/main/AndroidManifest.xml`),
caught by `lib/auth/native.ts`.

**On a Mac (iOS):** `npm install`; set `PRODUCTION_URL` in `capacitor.config.ts`
and the same host in `WKAppBoundDomains` in `Info.plist` (a test fails if they
differ); `npm run cap:sync`; `npm run cap:open`; in Xcode pick your team under
Signing & Capabilities, confirm the Bundle Identifier is `lib/brand.ts`'s
`BUNDLE_ID`, and put your Apple team id in `ios/App/ExportOptions.plist` (a
placeholder is there). Capacitor 8 uses Swift Package Manager: no `pod install`.

**Android:** needs Android Studio. `npm run cap:sync:android`,
`npm run cap:open:android`, let Gradle sync, Run. Keystores are generated outside
the repo and never committed.

| What you see | What it means |
| --- | --- |
| Google opens the browser, then nothing happens in the app | `readfluent://auth/callback` is missing from Supabase's Redirect URLs. |
| "This browser or app may not be secure" | Google is opening inside the app's WebView; `signInWith` should take the native branch. |
| Codesigning fails without naming why | `appId` and Xcode's Bundle Identifier differ. |
| The app opens blank | `PRODUCTION_URL` is wrong or the site isn't deployed. |

The store release steps (reviewer account, privacy policy, screenshots) are
written in M11 (SPEC.md §10).

## Layout

```
app/            routes (Next.js App Router)
components/     UI and the native bridges that render nothing
lib/            auth, purchases, plan rules, db clients, storage helpers
public/         sw.js (the offline shell), icons — never content
native-shell/   the one page Capacitor's webDir holds
ios/ android/   the native projects
supabase/       migrations and the plan-guard check
scripts/        make-icons, check-native-bundle, prove-sql
tests/unit/     vitest
```

# Setting up Supabase for ReadFluent

ReadFluent has its own Supabase project. Nothing is shared with any other app.

Until this is done the app still works: people can read, and the sign-in screen says
"Accounts aren't switched on yet". Once it is done, anonymous sessions start, the
"I already have an account" link appears on the first screen, the emailed sign-in code
works, and the answers from the onboarding questions are saved.

You do the three things only you can do (log in, pick a password, copy two keys).
The prompt below does the rest. Do it in this order.

## Part 1 - Claude in Chrome

Open Chrome, log in to **supabase.com**, **vercel.com** and **github.com** (the SQL lives in the private repo) yourself first, then paste
the prompt below into Claude in Chrome.

```
I need you to set up a Supabase project for my app ReadFluent and connect it to its
Vercel project. Work in the browser, step by step, and tell me what you did at each
step. Rules: if a page asks me to log in, do 2FA, verify an email, or pay for
anything, STOP and tell me - do not guess or work around it. Touch only what is named
below: do not change, delete or open any other project, organisation, team or setting.
Never type, paste or say any secret key out loud in your messages: when you must show
me a key, say only "present" and the first 6 characters.

PART A - Supabase (supabase.com)
1. Create a NEW project called "readfluent" (any region near the UK, e.g. London,
   free plan). If it asks for a database password, have me type one - do not make one
   up and do not repeat it.
2. When the project is ready, open Project Settings -> API. Note the Project URL
   (https://xxxx.supabase.co), the anon/public key, and the service_role key.
3. Open SQL Editor -> New query. Paste the ENTIRE contents of the file
   supabase/setup.sql from https://github.com/aman66-web/readfluent (branch
   claude/readfluent-template-setup-ewq3lj) and press Run. It must finish with
   "Success" and no error. If there is an error, STOP and show me the error text.
4. Then paste the ENTIRE contents of supabase/checks/plan_guard.sql from the same
   place into a new query and Run it. Tell me whether every column came back "t".
5. Authentication -> Sign In / Providers -> turn ON "Allow anonymous sign-ins".
   Make sure Email sign-in is ON. Leave Google and Apple OFF. Save.
6. Authentication -> Email Templates -> "Magic Link": replace the body with exactly:
     <h2>Your ReadFluent code</h2>
     <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   Save. Do the same for "Confirm signup". (The code must show {{ .Token }}, not a link.)
7. Authentication -> URL Configuration: Site URL = https://readfluent-eta.vercel.app
   Redirect URLs, add all three:
     https://readfluent-eta.vercel.app/auth/callback
     http://localhost:3000/auth/callback
     readfluent://auth/callback
   Save.

PART B - Vercel (vercel.com)
8. Open the existing Vercel project for ReadFluent (production URL
   https://readfluent-eta.vercel.app). Settings -> Environment Variables. Add these
   three for Production AND Preview:
     NEXT_PUBLIC_SUPABASE_URL        = the Project URL from step 2
     NEXT_PUBLIC_SUPABASE_ANON_KEY   = the anon/public key from step 2
     SUPABASE_SERVICE_ROLE_KEY       = the service_role key from step 2 (mark Sensitive)
   The service_role key must be ONLY in SUPABASE_SERVICE_ROLE_KEY, never in the other
   two, and must not have a NEXT_PUBLIC_ prefix.
9. Deployments -> open the latest Production deployment -> Redeploy (variables are only
   read at build time, so this step is required). Wait until it says Ready.

PART C - Check it
10. Open https://readfluent-eta.vercel.app/api/health . It should show
    "ok": true, "db": true, "service": true, "missing": [] and "wrongShape": [].
    Paste me exactly what it shows.
11. Open https://readfluent-eta.vercel.app/welcome?step=account . The card saying
    "Accounts aren't switched on yet" should be gone and an email box should be there.
    Tell me what you see.

Finish by listing: the Supabase project name and URL, which env vars you added (names
only), and anything that did not work.
```

## Part 2 - If something doesn't work

Open `https://readfluent-eta.vercel.app/api/health`. It says exactly which value is
missing or looks wrong (it never shows the values themselves).

| What you see | What it means |
| --- | --- |
| `"missing": ["NEXT_PUBLIC_..."]` | A variable isn't set for Production. Add it, then redeploy. |
| `db: true` but `ok: false` | `SUPABASE_SERVICE_ROLE_KEY` is missing or pasted in the wrong box. |
| Sign-in email arrives with a link, not a code | The Magic Link template doesn't contain `{{ .Token }}`. |
| "Anonymous sign-ins are disabled" | Step 5 wasn't saved. |
| Code emails don't arrive or are rate limited | Supabase's built-in sender is for testing. Before real users, set Project Settings -> Auth -> SMTP to a real sender (Resend, Postmark). |

## What is deliberately not set up here

- **Google and Apple buttons** stay off until their consoles are done (README,
  "Google and Apple sign-in"). The emailed code needs nothing else.
- **Payments** (RevenueCat) - M10. Nobody can be granted the paid plan from the app;
  only the server can write it.
- **Book content and photos** - these live in object storage, not in this database (SPEC.md §9).

## For whoever changes the database later

Add a new numbered file under `supabase/migrations/`, then run
`scripts/build-setup-sql.sh`. A test fails if `supabase/setup.sql` and the migrations
disagree.

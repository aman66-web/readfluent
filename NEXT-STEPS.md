# Next steps for the next session (written 2 Oct 2026) — STEPS 1-4 ARE DONE: the database is connected; only Google sign-in remains

The owner is tired and wants Claude Code to do as much as possible. Do not ask them to paste secrets into chat.
The owner stored the tokens as environment API credentials for hosts `api.vercel.com` and `api.supabase.com` (values are hidden from the session
and injected into requests to those hosts, so call the APIs WITHOUT an Authorization header first; if you get 401, check
whether `VERCEL_TOKEN` / `SUPABASE_ACCESS_TOKEN` exist as env vars instead and use them). Never print or commit any key.
If neither works, or a host is denied, say so in one line and point them at the environment settings (Edit, then
API credentials / Network access: api.vercel.com, api.supabase.com).

## State when this was written
- Supabase project `readfluent` exists: ref `erilcjzbnomgxhjnurce`, URL https://erilcjzbnomgxhjnurce.supabase.co,
  `supabase/setup.sql` ran, plan_guard checks passed, anonymous sign-in on, Email on, Site URL and 3 redirect URLs set.
- Not done: Vercel env vars; Google sign-in; Apple (skip, needs paid membership); email templates (need custom SMTP,
  so emailed codes do not work yet; the app's SignIn form expects a code).
- Production: https://readfluent-eta.vercel.app, check /api/health (needs ok/db/service true).
- Books: titles/blurbs/chapters translated in 19 languages; book PAGES are translated on the phone itself (Apple/Google on-device, Chrome on desktop); chapter 1 of 20 books is ready in es/fr/de/it/pt. No Google key (owner, 3 Oct 2026).

## Do, in order
1. Supabase keys without printing them: GET https://api.supabase.com/v1/projects/erilcjzbnomgxhjnurce/api-keys
   with `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`. Take the `anon` and `service_role` keys into shell variables only.
2. Find the Vercel project (name readfluent) with the Vercel API (`https://api.vercel.com/v9/projects`, Bearer $VERCEL_TOKEN;
   add `teamId` if it is under a team). Create/overwrite env vars for production and preview (type `encrypted`, `sensitive` for the
   service key): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. The service key must be
   ONLY in SUPABASE_SERVICE_ROLE_KEY. Never echo any value.
3. Redeploy production (API `POST /v13/deployments` with the latest deployment's git source, or `vercel redeploy`), wait for READY.
4. GET https://readfluent-eta.vercel.app/api/health: want ok, db, service true, missing [] and wrongShape []. Report exactly that.
5. Anonymous sign-in check: open /welcome?step=account (Playwright, Chromium at /opt/pw-browsers/chromium); the "Accounts aren't switched on" card must be gone.
6. Tell the owner: Google sign-in is the one thing left and needs Claude in Chrome (SETUP-PROMPT.md prompt 2, without the translator steps).
7. Remind them to delete both tokens when finished.

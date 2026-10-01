# Putting the preview on the internet (Vercel)

**Live now: https://readfluent-eta.vercel.app** (deployed 1 Oct 2026, production branch `claude/readfluent-template-setup-ewq3lj`, project `readfluent` under the Hobby team `aman-moneysave`). The steps below are how it was set up and how to redo it.

The app needs **no keys and no database** to run: with no environment variables it
runs in local mode, which is all the preview needs. You only need a free Vercel
account connected to GitHub.

The work lives on the branch `claude/readfluent-template-setup-ewq3lj`. `main` has
only a README, so Vercel's default (it builds `main`) has nothing to show. The fix is
to tell Vercel to treat that branch as the production branch until the work is merged.

## The easy way: give this to Claude in Chrome

Open Claude in Chrome in a browser where you are signed in to Vercel and GitHub,
and paste everything inside the box:

```
I want you to deploy a website for me on Vercel. Take it one step at a time and tell
me what you see as you go. Do exactly what is below and nothing else.

What it is: a Next.js app in the GitHub repository aman66-web/readfluent. The branch
to deploy is claude/readfluent-template-setup-ewq3lj (NOT main; main only has a
README). It needs no environment variables and no database.

Steps:
1. Go to https://vercel.com/new. I am already signed in. If you are asked to sign in,
   log in, enter a password, a code, or anything about payment, STOP and ask me.
2. Under "Import Git Repository", find aman66-web/readfluent and click Import.
   - If the repository is not listed, click "Adjust GitHub App Permissions" and give
     Vercel access to ONLY the repository readfluent (choose "Only select
     repositories", not "All repositories"). Then go back and import it.
3. On the configure screen:
   - Project name: readfluent
   - Framework Preset: Next.js (it should detect this itself)
   - Root Directory: leave as ./
   - Build and Output Settings: leave the defaults
   - Environment Variables: add NONE
   - Team/plan: use my personal Hobby account. Do NOT start a paid plan or a trial.
   Click Deploy.
4. The first deploy builds the main branch, which has no app in it, so it may fail
   or show nothing. That is expected and not a problem. Do not try to fix it.
5. Open the project's Settings. Find the production branch setting (it is under
   Settings > Environments > Production > Branch Tracking, or under Settings > Git
   > Production Branch). Change the production branch to:
   claude/readfluent-template-setup-ewq3lj
   and save.
6. Go to the Deployments tab. Find the newest deployment for the branch
   claude/readfluent-template-setup-ewq3lj. If there is none, redeploy that branch
   (Deployments > the branch's latest deployment > Redeploy, or push-trigger is not
   needed). Wait until its status is Ready.
   If that deployment is not marked as Production, use the "Promote to Production"
   option on it.
7. Open the production address (it should look like https://readfluent.vercel.app,
   or similar if that name was taken). Check it shows the title "ReadFluent", the
   tagline "Real books. Your level.", and a book called "Pride and Prejudice".
8. Tell me: (a) the exact production URL, (b) whether the page looked right, and
   (c) anything that failed, with the exact error text.

Rules: do not create anything other than this one Vercel project. Do not change,
delete or deploy any of my other projects. Do not add environment variables, domains,
databases, integrations or team members. If anything asks for money, a card, or a
password, stop and ask me.
```

When it reports back, send me the URL. From then on, **every time I push to that
branch Vercel redeploys by itself** (about a minute), so you can open the site, tell me
what to change, and refresh to see it.

## By hand (if you would rather click it yourself)

1. vercel.com/new → import `aman66-web/readfluent` (give Vercel access to that one
   repository only) → name `readfluent` → Deploy. Add no environment variables.
2. Project → Settings → Environments → Production → Branch Tracking (or Settings →
   Git → Production Branch): set it to `claude/readfluent-template-setup-ewq3lj`.
3. Deployments → redeploy that branch → open the production address.

## Looking at it on your phone

Open the URL in your phone's browser. On iPhone use Share → Add to Home Screen, on
Android the menu → Install app, and it opens full screen like an app.

## Later

When the work is merged to `main`, switch the production branch back to `main`. Set
`PRODUCTION_URL` in `capacitor.config.ts` (and the same host in `WKAppBoundDomains`)
to the real URL before building the store apps (M11).

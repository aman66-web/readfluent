import { NextResponse } from "next/server";
import { safeNext, SIGN_IN_FAILED } from "@/lib/auth/next";
import { createClient } from "@/lib/db/server";

/**
 * Where a provider sign-in (Google, Apple) lands: it sends the browser here
 * with `?code=`, the code is traded for a session on the server — so the
 * cookies are set before any page renders — and the browser goes on to
 * `?next=` (a path on this site; anything else is the home screen). Anything
 * that fails lands on the sign-in with `?error=auth`, which says so (signing in
 * is required, so there is nothing to carry on without).
 *
 * The emailed code does not come through here: it is a session the moment
 * `verifyOtp` accepts it, on whatever screen asked for it, with no redirect
 * in between.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = publicOrigin(req, url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code && !url.searchParams.get("error")) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
    } catch {
      // No project configured, or the code was stale: fall through.
    }
  }
  return NextResponse.redirect(new URL(SIGN_IN_FAILED, origin));
}

/**
 * The address the learner is actually at.
 *
 * Behind a proxy — which is every deploy of this — the request the route sees
 * carries the internal host, not the one in the address bar. Redirecting to
 * `url.origin` would send a learner who has just signed in to a hostname that
 * means nothing to them and holds none of their cookies, which reads as a
 * sign-in that silently failed. The forwarded headers are the real address;
 * they are only trusted here because in a Next deploy they are set by the
 * platform in front of the app, not by the browser.
 */
function publicOrigin(req: Request, url: URL): string {
  const host = req.headers.get("x-forwarded-host");
  if (!host) return url.origin;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

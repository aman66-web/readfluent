import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { dbConfigured } from "@/lib/db/env";
import { hasAppSession, isSitePath, marketingHosts, sitePage } from "@/lib/site/hosts";
import { needsOnboarding, ONBOARDED_COOKIE, ONBOARDED_MAX_AGE, WELCOME_PATH } from "@/lib/onboarding";

/**
 * Refreshes the Supabase session on every page request, and signs brand-new
 * visitors in anonymously so they can start a session without a sign-up wall
 * (SPEC.md §5 "Accounts", §16 M0).
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts` and the exported function to
 * `proxy`. The edge runtime is not supported here; the runtime is nodejs and
 * is not configurable.
 */
export async function proxy(request: NextRequest) {
  const response = await route(request);
  // A cookie a script wrote is forgotten by WebKit after a week, and a reader who has been
  // through the first screen must not be sent back to it. One the server sets lasts the year.
  if (request.cookies.has(ONBOARDED_COOKIE) && !response.cookies.has(ONBOARDED_COOKIE)) {
    response.cookies.set(ONBOARDED_COOKIE, "1", { path: "/", maxAge: ONBOARDED_MAX_AGE, sameSite: "lax" });
  }
  return response;
}

async function route(request: NextRequest): Promise<NextResponse> {
  // The marketing site (lib/site/hosts.ts, public/site): the root of
  // the marketing domain is the static page, not the app. Decided before anything
  // touches Supabase, so somebody reading about the app is not signed in to
  // it. Every other path on that domain carries on into the app below.
  const { pathname } = request.nextUrl;
  const site = sitePage({
    host: request.headers.get("host") ?? request.nextUrl.host,
    pathname,
    hasSession: hasAppSession(request.cookies.getAll().map((c) => c.name)),
  }, marketingHosts(process.env.MARKETING_HOSTS));
  if (site) return NextResponse.rewrite(new URL(site, request.url));
  // The site's own files, on any host, are static and need no session.
  if (isSitePath(pathname)) return NextResponse.next();

  // Somebody who has not been through the first screen opens on it: decided here,
  // on the server, so the library never flashes up and then moves (lib/onboarding).
  if (needsOnboarding(pathname, request.cookies.has(ONBOARDED_COOKIE))) {
    return NextResponse.redirect(new URL(WELCOME_PATH, request.url));
  }

  // Without a project there is no session to refresh, and constructing the
  // client would throw on every request — including the ones that need no
  // database at all. The app runs with no database configured at all (local
  // mode: one user, no sign-in, decks kept in the browser); this is what lets it.
  if (!dbConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  // Prefetches (a link scrolling into view) and background fetches from somebody with no session need no
  // refresh and no sign-in; asking the auth server for each one made every prefetch wait on a round trip.
  const prefetch = request.headers.has("next-router-prefetch") || (request.headers.get("sec-purpose") ?? "").includes("prefetch");
  const document = request.headers.get("sec-fetch-dest") === "document";
  if (prefetch || (!document && !hasAppSession(request.cookies.getAll().map((c) => c.name)))) return response;

  try {
    response = await refresh(request, response);
  } catch {
    // Whatever went wrong — a malformed project URL, a key that is not a key,
    // the auth service being down — refreshing a session is not worth a page.
    // This runs in front of EVERY request, so a throw here is not one broken
    // feature, it is the whole app returning 500, including the screens that
    // need no account at all and the health check that would explain why. An
    // app that studies offline must not be taken down by a login server.
    return NextResponse.next({ request });
  }

  return response;
}

/** The session refresh proper. Separated so the caller above can contain it. */
async function refresh(request: NextRequest, initial: NextResponse): Promise<NextResponse> {
  let response = initial;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser(): a stray await
  // here makes sessions randomly fail to refresh and is very hard to debug.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A device with no account is still a learner, and an anonymous session is
  // what lets them start without a sign-up wall. It needs "Allow anonymous
  // sign-ins" switched on in Supabase; when it is off this returns an error
  // rather than throwing, and the app carries on signed out — which is exactly
  // what it should do, since everything but sync works that way anyway.
  // Only for somebody opening a page: a crawler, a link preview or an uptime check has no
  // cookies, and each would otherwise become a user (and use up the sign-in allowance).
  if (!user && request.headers.get("sec-fetch-mode") === "navigate" && request.headers.get("sec-fetch-dest") === "document") {
    await supabase.auth.signInAnonymously();
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Pages only: not static assets, images, the API routes (they read the session
     * themselves), the sign-in callback, the service worker, the manifest or robots.
     */
    "/((?!_next/static|_next/image|api/|auth/callback|favicon.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

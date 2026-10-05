/**
 * The account gate: ReadFluent needs a signed-in account (owner, 6 Oct 2026). Pure and import-free, so the
 * proxy (server), the root layout's guard (browser) and the tests all ask the same questions.
 *
 * What counts as signed in is a REAL account: an email, Google or Apple sign-in. The anonymous session the
 * proxy makes for a first-time visitor (so the first screens can run) is not one.
 */

/** Pages anybody may open with no account: the first run (which holds the sign-in), and the legal pages the stores and the law require to be readable before signing in. */
const OPEN = ["/welcome", "/privacy", "/terms", "/support", "/offline", "/health"] as const;

/** Whether this page needs a signed-in account. Everything but the open pages does; the API routes and the sign-in callback never reach this (they are outside the proxy and check the session themselves). */
export function needsAccount(pathname: string): boolean {
  return !OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Whether a Supabase user is a real account: present, and not the anonymous session. */
export function isRealAccount(user: { is_anonymous?: boolean | null } | null | undefined): boolean {
  return !!user && !user.is_anonymous;
}

/**
 * Where somebody without an account is sent. A device that has never been through the first run starts it from the
 * top (its questions come before the sign-in); one that has (it has the first-screen cookie, like a phone that has
 * been reading without an account) lands on the sign-in itself, with nothing to go back to.
 */
export function signInRedirect(onboarded: boolean): string {
  return onboarded ? "/welcome?step=account" : "/welcome";
}

/**
 * The step of the first run a visitor may open. The steps after the sign-in only open with an account, so a link
 * to one, the browser's Forward, or a half-finished run all land on the sign-in instead.
 */
export function clampStep(step: number, accountStep: number, signedIn: boolean): number {
  return signedIn || step <= accountStep ? step : accountStep;
}

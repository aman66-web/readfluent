/**
 * Where a sign-in goes next, and the one rule about what "next" may be.
 *
 * Pure and import-free so the callback route (server), the native deep-link
 * handler and the web sign-in (both client) can all use it.
 */

/** The route a provider sign-in comes back to; it trades the code for a session. */
export const CALLBACK_PATH = "/auth/callback";

/** Where a failed provider sign-in lands: the sign-in itself, which reads `?error=auth` and says so (an account is required, so there is nowhere else to go). */
export const SIGN_IN_FAILED = "/welcome?step=account&error=auth";

/**
 * The redirect target the web sign-in hands the provider, e.g.
 * `https://host/auth/callback?next=%2Flibrary`. The origin's trailing slashes
 * are dropped so the path never doubles up.
 */
export function callbackUrl(origin: string, next = "/"): string {
  return `${origin.replace(/\/+$/, "")}${CALLBACK_PATH}?next=${encodeURIComponent(safeNext(next))}`;
}

/**
 * A `next` that is a path on this site, or "/".
 *
 * Anything else (another origin, a protocol-relative `//host`, a backslash
 * trick some browsers read as a slash) would turn the sign-in redirect into an
 * open redirect, so it is replaced rather than repaired.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  // A browser drops tabs and line breaks from a URL before reading it, so "/\t/host" is "//host".
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return "/";
  return next;
}

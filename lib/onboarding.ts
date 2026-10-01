/**
 * Whether somebody has been through the first screen, and where a visitor who
 * has not should land.
 *
 * A cookie, not device storage, so the redirect can happen on the server (in
 * proxy.ts) before any page is sent: a new visitor never sees the library flash
 * up and then get moved. The cookie holds nothing about the reader.
 */
export const ONBOARDED_COOKIE = "rf_onboarded";

/** The first screen. Always viewable, so it can be looked at (and edited) after the first time. */
export const WELCOME_PATH = "/welcome";

/**
 * Whether a request should be sent to the first screen: only the app's front
 * door (`/`), and only if the cookie is absent. A deep link (a book, a page of
 * one) is never hijacked.
 */
export function needsOnboarding(pathname: string, hasCookie: boolean): boolean {
  return pathname === "/" && !hasCookie;
}

/** Remember, for a year, that the first screen has been seen. Browser only. */
export function markOnboarded(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ONBOARDED_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
}

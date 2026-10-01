import { CACHE_PREFIX, STORAGE_PREFIX } from "@/lib/brand";
import { ONBOARDED_COOKIE, WELCOME_PATH } from "@/lib/onboarding";
import { notify } from "./local";

/**
 * Erase everything this app has kept on the device, and start again from the first screen.
 *
 * "Everything" is every localStorage key the app writes (they all share one prefix,
 * lib/brand), the first-screen cookie, and the app's own caches: the shell and, once
 * they exist, downloaded books (M9). Used by "Delete account" and "Delete my data on this
 * device". Whatever is on a server is a separate call and is not this function's business.
 */

/** True for a key this app wrote. */
export const isOurKey = (key: string): boolean => key.startsWith(STORAGE_PREFIX);

export async function wipeEverything(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const mine = Object.keys(window.localStorage).filter(isOurKey);
    for (const key of mine) window.localStorage.removeItem(key);
  } catch { /* storage is blocked: there is nothing of ours in it */ }
  try {
    for (const key of Object.keys(window.sessionStorage).filter((k) => isOurKey(k) || k.startsWith(CACHE_PREFIX))) window.sessionStorage.removeItem(key);
  } catch { /* same */ }
  document.cookie = `${ONBOARDED_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  try {
    if ("caches" in window) {
      const names = await window.caches.keys();
      await Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX)).map((n) => window.caches.delete(n)));
    }
  } catch { /* no cache storage */ }
  // Anything on screen that was reading a store now reads an empty one.
  notify();
}

/** Wipes, then loads the first screen fresh, so nothing in memory outlives it. */
export async function startAgain(): Promise<void> {
  await wipeEverything();
  window.location.assign(WELCOME_PATH);
}

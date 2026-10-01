/**
 * Putting the app on the reader's home screen.
 *
 * Android and desktop Chrome offer a prompt of their own, and fire `beforeinstallprompt`
 * once, early, so it is caught for the whole page by `captureInstallPrompt` (called from
 * `Pwa`) and kept until a screen asks for it. iPhone has no such prompt: the reader has
 * to use Share → Add to Home Screen themselves, so the app can only show how.
 *
 * This is the app's icon on the home screen. A live widget (Lex with the reader's level) is
 * a native feature and waits for the store build (M11).
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;

/** Keep the browser's install prompt for later. Returns the way to stop listening. */
export function captureInstallPrompt(): () => void {
  const onPrompt = (e: Event) => { e.preventDefault(); deferred = e as InstallPromptEvent; };
  const onInstalled = () => { deferred = null; };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
}

/** An iPhone or iPad (an iPad can say it is a Mac, so touch points tell them apart). */
export function isIos(ua: string, touchPoints: number): boolean {
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touchPoints > 1);
}

/** Already opened from the home screen. */
export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * What can be done from here: `installed` (nothing to do), `prompt` (the browser will ask),
 * `ios` (show how, it cannot be done for them) or `manual` (any other browser: nothing to offer).
 */
export type InstallKind = "installed" | "prompt" | "ios" | "manual";
export function installKind(): InstallKind {
  if (isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isIos(navigator.userAgent, navigator.maxTouchPoints)) return "ios";
  return "manual";
}

/** Show the browser's own prompt. True if the reader accepted it. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  try {
    await e.prompt();
    return (await e.userChoice).outcome === "accepted";
  } catch {
    return false;
  }
}

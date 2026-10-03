/**
 * Whether this page is running inside the native app, without loading Capacitor or anything else.
 * The native shell puts `Capacitor` on window before the page's scripts run; a browser never has it.
 * Used by the root layout's bridges so the web never downloads the sign-in and purchase code.
 */
export function onNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try { return Boolean(cap?.isNativePlatform?.()); } catch { return false; }
}

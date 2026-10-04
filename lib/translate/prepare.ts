import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import { Capacitor } from "@capacitor/core";

/** Whether this phone will be asked, so a screen can say so (the app only; a browser asks on the first book). */
export const willAskToDownload = (learn: string | null | undefined): boolean => Boolean(learn) && learn !== "en" && Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("OnDeviceTranslate");

/**
 * Asks the phone to fetch the language being learned (English to it) now, while the reader is still signing up, so the
 * first book opens at once instead of stopping at a download screen. The phone shows its own sheet; the languages are
 * Apple's and Google's to keep (shared by every app, not part of ours, which stays small), so they cannot ship inside the app.
 * Asked once per language: if the reader closes the sheet, the book's own "Download" button is still there.
 */
export async function prepareLanguageOnce(learn: string | null | undefined): Promise<void> {
  if (!willAskToDownload(learn) || !learn) return;
  const key = storageKey(`langprep.${learn}`);
  if (readRaw(key)) return;
  try {
    // Loaded here, not at the top: the translator registers its native plugin the moment it is imported.
    const { devicePrepare, deviceStatus } = await import("./device");
    if ((await deviceStatus("en", learn)) !== "download") return;
    writeRaw(key, "1");
    await devicePrepare("en", learn);
  } catch { /* the book's own download button is the fallback */ }
}

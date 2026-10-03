/**
 * The phone's own translator, free and offline (owner, 3 Oct 2026: books are translated on the device, at no
 * cost): Apple's Translation framework on iPhone (iOS 18+) and Google's ML Kit on Android, through the app's
 * own Capacitor plugin "OnDeviceTranslate" (ios/App/App/SceneDelegate.swift, android/.../OnDeviceTranslatePlugin.java).
 * In a desktop browser that has one (Chrome's built-in Translator), that is used instead. Anywhere else there is
 * no device translator and the book stays in English. Client only.
 *
 * Nothing here is kept between visits: a version is translated when it is opened and held in memory for the
 * rest of the visit (CLAUDE.md: reading writes nothing to the phone's storage unless the reader downloads).
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { TranslateFn } from "./variant";

/** "ready": can translate now; "download": the language must be fetched once (the phone asks); "unsupported": not on this device. */
export type DeviceStatus = "ready" | "download" | "unsupported";

interface OnDeviceTranslatePlugin {
  status(o: { from: string; to: string }): Promise<{ status: DeviceStatus }>;
  /** Fetches the languages if needed (the phone may show its own download sheet). */
  prepare(o: { from: string; to: string }): Promise<{ ready: boolean }>;
  translate(o: { texts: string[]; from: string; to: string }): Promise<{ texts: string[] }>;
}

const Native = registerPlugin<OnDeviceTranslatePlugin>("OnDeviceTranslate");

/** Chrome's built-in on-device translator (desktop Chrome 138+), as far as it is used here. */
interface ChromeTranslator { translate(text: string): Promise<string> }
interface ChromeTranslatorApi {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(o: { sourceLanguage: string; targetLanguage: string }): Promise<ChromeTranslator>;
}
const chromeApi = (): ChromeTranslatorApi | null => {
  if (typeof globalThis === "undefined") return null;
  const t = (globalThis as unknown as { Translator?: ChromeTranslatorApi }).Translator;
  return t && typeof t.availability === "function" && typeof t.create === "function" ? t : null;
};

export type DeviceKind = "native" | "browser";

/** Which on-device translator this device has, if any. */
export function deviceKind(): DeviceKind | null {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("OnDeviceTranslate")) return "native";
  } catch { /* not in the app */ }
  return chromeApi() ? "browser" : null;
}

export async function deviceStatus(from: string, to: string): Promise<DeviceStatus> {
  const kind = deviceKind();
  try {
    if (kind === "native") return (await Native.status({ from, to })).status;
    if (kind === "browser") {
      const a = await chromeApi()!.availability({ sourceLanguage: from, targetLanguage: to });
      return a === "available" ? "ready" : a === "unavailable" ? "unsupported" : "download";
    }
  } catch { /* fall through */ }
  return "unsupported";
}

/** Fetches what the device needs to translate between the two languages. Call from a tap: phones and browsers ask first. */
export async function devicePrepare(from: string, to: string): Promise<boolean> {
  const kind = deviceKind();
  try {
    if (kind === "native") return (await Native.prepare({ from, to })).ready;
    if (kind === "browser") { await chromeApi()!.create({ sourceLanguage: from, targetLanguage: to }); return true; }
  } catch { /* declined or failed */ }
  return false;
}

const BATCH = 40;
const translators = new Map<string, Promise<ChromeTranslator>>();
const memo = new Map<string, string>();

/** Translates on the device, in batches, remembering each answer for this visit. Throws when there is no device translator. */
export const deviceTranslate: TranslateFn = async (texts, from, to) => {
  const kind = deviceKind();
  if (!kind) throw new Error("no device translator");
  const out: string[] = new Array(texts.length);
  const todo: number[] = [];
  texts.forEach((t, i) => {
    const hit = memo.get(`${from}>${to}>${t}`);
    if (hit !== undefined) out[i] = hit; else if (!t.trim()) out[i] = t; else todo.push(i);
  });
  for (let s = 0; s < todo.length; s += BATCH) {
    const idx = todo.slice(s, s + BATCH);
    const chunk = idx.map((i) => texts[i]);
    let done: string[];
    if (kind === "native") {
      done = (await Native.translate({ texts: chunk, from, to })).texts;
    } else {
      const key = `${from}>${to}`;
      if (!translators.has(key)) {
        // A failed create() (say, the download was refused this time) must not be remembered for the visit.
        const made = chromeApi()!.create({ sourceLanguage: from, targetLanguage: to });
        translators.set(key, made);
        made.catch(() => { if (translators.get(key) === made) translators.delete(key); });
      }
      const tr = await translators.get(key)!;
      done = await Promise.all(chunk.map((c) => tr.translate(c)));
    }
    idx.forEach((i, k) => {
      const v = done[k] ?? texts[i];
      out[i] = v;
      memo.set(`${from}>${to}>${texts[i]}`, v);
    });
  }
  return out;
};

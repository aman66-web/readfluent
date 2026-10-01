import { storageKey } from "@/lib/brand";
import { notify, readRaw, writeRaw } from "@/lib/store/local";

/**
 * The words a reader saved from a word card, kept on the device. Flashcards (M7) will read them;
 * until then they are only remembered. `<language>:<word>` is the key, so the same spelling in
 * two languages stays two words.
 */
export const SAVED_KEY = storageKey("words");

export interface SavedWord { word: string; lang: string; meaning: string; book: string; at: number }
export type Saved = Record<string, SavedWord>;

export const savedId = (lang: string, word: string): string => `${lang}:${word.toLowerCase()}`;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Never throws: a corrupt value is an empty list. */
export function parseSaved(raw: string | null | undefined): Saved {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!isObject(v)) return {};
    const out: Saved = {};
    for (const [k, w] of Object.entries(v)) {
      if (isObject(w) && typeof w.word === "string" && typeof w.lang === "string" && typeof w.meaning === "string" && typeof w.book === "string" && typeof w.at === "number") {
        out[k] = { word: w.word, lang: w.lang, meaning: w.meaning, book: w.book, at: w.at };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Save the word, or take it out if it was saved. True if it is saved afterwards. */
export function toggleSaved(entry: Omit<SavedWord, "at">): boolean {
  const all = parseSaved(readRaw(SAVED_KEY));
  const id = savedId(entry.lang, entry.word);
  const was = id in all;
  if (was) delete all[id];
  else all[id] = { ...entry, at: Date.now() };
  writeRaw(SAVED_KEY, JSON.stringify(all));
  notify();
  return !was;
}

/** Take a saved word out of the list. */
export function removeSaved(id: string): void {
  const all = parseSaved(readRaw(SAVED_KEY));
  if (!(id in all)) return;
  delete all[id];
  writeRaw(SAVED_KEY, JSON.stringify(all));
  notify();
}

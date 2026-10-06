import { storageKey } from "@/lib/brand";
import { notify, readRaw, writeRaw } from "@/lib/store/local";

/**
 * The words a reader saved from a word card, kept on the device. Flashcards (M7) will read them;
 * until then they are only remembered. `<language>:<word>` is the key, so the same spelling in
 * two languages stays two words.
 */
export const SAVED_KEY = storageKey("words");

/** `book` is the title it was saved under; `slug` (words saved from 6 Oct 2026 on) names the book itself, which a title cannot, since a title is shown in the reader's language. */
export interface SavedWord { word: string; lang: string; meaning: string; book: string; slug?: string; at: number }
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
        out[k] = { word: w.word, lang: w.lang, meaning: w.meaning, book: w.book, ...(typeof w.slug === "string" && w.slug ? { slug: w.slug } : {}), at: w.at };
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

/**
 * The saved words that came from one book: those saved with its slug, and older ones (saved before the slug was kept) whose
 * title is one of the book's names (its own, or as the reader's language shows it).
 */
export function wordsOfBook(saved: Saved, slug: string, titles: readonly string[] = []): string[] {
  const names = titles.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return Object.entries(saved)
    .filter(([, w]) => (w.slug ? w.slug === slug : names.includes(w.book.trim().toLowerCase())))
    .map(([id]) => id);
}

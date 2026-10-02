import type { LanguageCode } from "@/lib/onboarding/languages";

/**
 * Titles, blurbs and chapter names of every book in the reader's language, fetched the first time a language is
 * needed (/api/book-text) and kept in memory. Until it arrives, or if it cannot be fetched, the English shows.
 */
export interface BookMeta { t: string; b: string; c: string[] }
type Table = Record<string, BookMeta>;

const loaded = new Map<string, Table>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;

export const bookMetaFor = (code: LanguageCode): Table | null => loaded.get(code) ?? null;
export const bookMetaVersion = () => version;
export function subscribeBookMeta(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }

export function loadBookMeta(code: LanguageCode): Promise<void> {
  if (code === "en" || loaded.has(code)) return Promise.resolve();
  const existing = pending.get(code);
  if (existing) return existing;
  const p = fetch(`/api/book-text?lang=${code}`)
    .then((r) => (r.ok ? (r.json() as Promise<Table>) : null))
    .then((table) => {
      if (!table) return;
      loaded.set(code, table);
      version += 1;
      listeners.forEach((l) => l());
    })
    .catch(() => { /* offline and never fetched: English stays */ })
    .finally(() => { pending.delete(code); });
  pending.set(code, p);
  return p;
}

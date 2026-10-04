import type { WordEntry } from "@/lib/preview/spanish";

/**
 * Books the phone has translated, kept on the phone so they open at once next time: one record per book, level and
 * language (`<slug>/<level>/<lang>`), the pages and, once made, the word cards. IndexedDB, because a book is tens of
 * kilobytes and localStorage is for small things. Where IndexedDB is missing or refused (a private window), a copy in
 * memory keeps the visit working. Erased with everything else by "Delete my data on this device" (lib/store/wipe.ts).
 */
export interface CachedBook { pages: string[]; dict?: Record<string, WordEntry>; /** The language the cards' meanings are in. */ speak?: string }

const DB = "readfluent-translations";
const STORE = "books";
const memory = new Map<string, CachedBook>();
let opened: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  opened ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return opened;
}

const wrap = <T,>(req: IDBRequest<T>): Promise<T | undefined> => new Promise((resolve) => { req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(undefined); });

export const cacheKey = (slug: string, level: string, lang: string): string => `${slug}/${level}/${lang}`;

export async function getCached(key: string): Promise<CachedBook | null> {
  const hit = memory.get(key);
  if (hit) return hit;
  const db = await open();
  if (!db) return null;
  try {
    const got = await wrap<CachedBook>(db.transaction(STORE, "readonly").objectStore(STORE).get(key));
    if (got && Array.isArray(got.pages)) { memory.set(key, got); return got; }
  } catch { /* unreadable: as if absent */ }
  return null;
}

export async function setCached(key: string, book: CachedBook): Promise<void> {
  memory.set(key, book);
  const db = await open();
  if (!db) return;
  try { await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).put(book, key)); } catch { /* kept in memory only */ }
}

export async function hasCached(key: string): Promise<boolean> {
  if (memory.has(key)) return true;
  const db = await open();
  if (!db) return false;
  try { return (await wrap<number>(db.transaction(STORE, "readonly").objectStore(STORE).count(key))) === 1; } catch { return false; }
}

/** Everything translated on this phone, forgotten. */
export async function clearCached(): Promise<void> {
  memory.clear();
  const db = await open();
  if (!db) return;
  try { await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).clear()); } catch { /* nothing to clear */ }
}

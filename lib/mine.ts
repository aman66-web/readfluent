import { LEVELS, levelById, lengthByPages } from "@/lib/content/limits";
import { findBook, pageCount, type PreviewBook } from "@/lib/preview/catalog";
import { canonicalKey, parseVersionKey, type Progress } from "@/lib/progress";

/**
 * The reader's own books, worked out from what is kept on the device: the page they got
 * to in each version (lib/progress) and the versions they finished (lib/xp/ledger). Pure.
 * A version's key is `<slug>/<LEVEL>-<length>`; a version for a book that is not in the
 * library any more is left out rather than shown broken.
 */

export interface MineEntry {
  key: string;
  book: PreviewBook;
  levelLabel: string;
  levelSlug: string;
  length: number;
  /** The page they are on, 1-based, and how many pages the version has. */
  page: number;
  total: number;
}

export { parseVersionKey };

function entryOf(key: string, index: number): MineEntry | null {
  const v = parseVersionKey(key);
  if (!v) return null;
  const book = findBook(v.slug);
  const level = levelById(v.level);
  if (!book || !level || !lengthByPages(v.length)) return null;
  const total = pageCount(book, level.id);
  return { key, book, levelLabel: level.label, levelSlug: level.slug, length: v.length, page: Math.min(total, Math.max(0, index) + 1), total };
}

/** Versions started and not finished, the one opened most recently last in storage first. */
export function reading(progress: Progress, done: readonly string[]): MineEntry[] {
  const doneKeys = new Set(done.map(canonicalKey));
  return Object.entries(progress)
    .filter(([key]) => !doneKeys.has(key))
    .map(([key, index]) => entryOf(key, index))
    .filter((e): e is MineEntry => e !== null)
    .reverse();
}

export function finished(done: readonly string[]): MineEntry[] {
  return [...new Set(done.map(canonicalKey))].map((key) => entryOf(key, Number.MAX_SAFE_INTEGER)).filter((e): e is MineEntry => e !== null).reverse();
}

export const readHref = (e: Pick<MineEntry, "book" | "levelSlug" | "length">) => `/read/${e.book.slug}/${e.levelSlug}/${e.length}`;
export { LEVELS };

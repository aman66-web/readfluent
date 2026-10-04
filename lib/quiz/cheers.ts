import type { MessageId } from "@/lib/i18n/en";

/**
 * When Pluto says something while the reader reads (owner, 4 Oct 2026: "cheering the person along here and there, just being there").
 * Rarely and never twice running: a line every so often, a milestone now and then, a chat invitation. Pure: the page and where the book is decide.
 */
export interface Cheer { id: MessageId; vars?: Record<string, number>; talk?: boolean }

const PLAIN: MessageId[] = ["cheer.2", "cheer.3", "cheer.4", "cheer.5", "cheer.6"];

/** `index` is the 0-based page just arrived on (moving forward), `total` the pages in the book, `last` the page of the previous cheer (or -99). */
export function cheerFor(index: number, total: number, last: number): Cheer | null {
  if (total <= 0 || index <= 0 || index >= total) return null;
  const page = index + 1;
  if (index - last < 3) return null;
  const half = Math.floor(total / 2);
  if (page === half) return { id: "cheer.half" };
  if (page === total - Math.max(2, Math.round(total * 0.05))) return { id: "cheer.almost" };
  if (page % 25 === 0) return { id: "reader.cheer.pages", vars: { n: page } };
  if (page === 9 || page % 30 === 12) return { id: "reader.cheer.talk", talk: true };
  // Otherwise a short cheer on a spaced, unpredictable beat: every fourth to seventh page.
  const gap = 4 + ((page * 7) % 4);
  if (page >= 3 && (page - 3) % gap === 0) return { id: PLAIN[(page * 3) % PLAIN.length] };
  return null;
}

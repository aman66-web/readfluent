/**
 * The order the phone translates the library in, in the background: the shelves the reader chose first, full-length books
 * before the short ones, and the library's own order inside each group. Pure, so it can be tested.
 */
export interface QueueBook { slug: string; category: string; pages: number }

export function orderBooks(books: readonly QueueBook[], liked: readonly string[]): string[] {
  const rank = (b: QueueBook) => (liked.includes(b.category) ? 0 : 2) + (b.pages >= 200 ? 0 : 1);
  return books
    .map((b, i) => ({ b, i }))
    .sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i)
    .map((x) => x.b.slug);
}

/** The levels to do for a reader at `level` (A1…C2): theirs first, then the others, nearest first. */
export function levelOrder(level: string | null | undefined): ("a1a2" | "b1b2" | "c1c2")[] {
  const mine = level === "B1" || level === "B2" ? "b1b2" : level === "C1" || level === "C2" ? "c1c2" : "a1a2";
  const all: ("a1a2" | "b1b2" | "c1c2")[] = ["a1a2", "b1b2", "c1c2"];
  const at = all.indexOf(mine);
  return [...all].sort((a, b) => Math.abs(all.indexOf(a) - at) - Math.abs(all.indexOf(b) - at) || all.indexOf(a) - all.indexOf(b));
}

import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import { BLOCK } from "./mini";

/** Which five-page blocks of a version have already had their quick check offered (answered or skipped), so it is offered once. */
export const CHECKS_KEY = storageKey("checks");

const read = (): Record<string, number> => {
  try { const v = JSON.parse(readRaw(CHECKS_KEY) || "{}") as unknown; return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, number>) : {}; } catch { return {}; }
};

/** The block (1 = pages 1 to 5) most recently offered for a version; 0 if none. */
export const lastBlock = (version: string): number => { const n = read()[version]; return typeof n === "number" && n > 0 ? Math.floor(n) : 0; };
export function markBlock(version: string, block: number): void {
  const all = read();
  if ((all[version] ?? 0) >= block) return;
  all[version] = block;
  writeRaw(CHECKS_KEY, JSON.stringify(all));
}

/**
 * The block (1 = pages 1 to 5) that the reader has just finished, by moving forward from page `from` to page `index` (0-based); null when no
 * fifth page was passed. A fast swipe or two presses of Next can skip a page (4 to 6), so any short step forward past a fifth counts;
 * a long jump (reopening a book on page 40) does not.
 */
export const blockFinished = (index: number, from: number): number | null => {
  if (index <= from || index - from > 3) return null;
  const block = Math.floor(index / BLOCK);
  return block >= 1 && block > Math.floor(from / BLOCK) ? block : null;
};

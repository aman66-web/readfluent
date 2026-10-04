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

/** The block that has just been finished by arriving on page `index` (0-based) from the page before it; null when it is not the end of a block. */
export const blockFinished = (index: number, from: number): number | null => (index > 0 && index % BLOCK === 0 && from === index - 1 ? index / BLOCK : null);

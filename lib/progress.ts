import { readRaw, writeRaw } from "@/lib/store/local";
import { storageKey } from "@/lib/brand";

/**
 * Where a reader is, kept on their device (CLAUDE.md, "Accounts and money":
 * reading needs no account). Two small documents:
 *
 *   progress  { "<slug>/<level>-<length>": pageIndex }   resume where you left
 *   choice    { "<slug>": { level, length } }            the last level and length picked per book
 *
 * Both are read through `parse*`, which never throws: a corrupt value must
 * never crash a screen. Both will become `sync_docs` documents in M8.
 */
export const PROGRESS_KEY = storageKey("progress");
export const CHOICE_KEY = storageKey("choice");

export type Progress = Record<string, number>;
export type Choice = Record<string, { level: string; length: number }>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseProgress(raw: string | null | undefined): Progress {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!isObject(v)) return {};
    const out: Progress = {};
    for (const [k, n] of Object.entries(v)) if (typeof n === "number" && Number.isInteger(n) && n >= 0) out[k] = n;
    return out;
  } catch {
    return {};
  }
}

export function parseChoice(raw: string | null | undefined): Choice {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!isObject(v)) return {};
    const out: Choice = {};
    for (const [k, c] of Object.entries(v)) {
      if (isObject(c) && typeof c.level === "string" && typeof c.length === "number") out[k] = { level: c.level, length: c.length };
    }
    return out;
  } catch {
    return {};
  }
}

export const versionKey = (slug: string, level: string, length: number): string => `${slug}/${level}-${length}`;

/** A saved page index, clamped to the pages that exist now; 0 when there is none. */
export function resumeIndex(saved: number | undefined, pageCount: number): number {
  if (saved === undefined || pageCount <= 0) return 0;
  return Math.min(Math.max(0, saved), pageCount - 1);
}

export function savePage(slug: string, level: string, length: number, index: number): void {
  const all = parseProgress(readRaw(PROGRESS_KEY));
  const key = versionKey(slug, level, length);
  // Taken out first so it goes to the end: assigning an existing key keeps its old place, and "My books" lists the last one opened first.
  delete all[key];
  all[key] = index;
  writeRaw(PROGRESS_KEY, JSON.stringify(all));
}

export function readPage(slug: string, level: string, length: number): number | undefined {
  return parseProgress(readRaw(PROGRESS_KEY))[versionKey(slug, level, length)];
}

export function saveChoice(slug: string, level: string, length: number): void {
  const all = parseChoice(readRaw(CHOICE_KEY));
  all[slug] = { level, length };
  writeRaw(CHOICE_KEY, JSON.stringify(all));
}

export function readChoice(slug: string): { level: string; length: number } | undefined {
  return parseChoice(readRaw(CHOICE_KEY))[slug];
}

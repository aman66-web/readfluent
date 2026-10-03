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
    for (const [k, n] of Object.entries(v)) {
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0) continue;
      // Older saves used a lowercase level ("a1a2") or a language suffix ("emma.es"): they count as the same version.
      const c = canonicalKey(k);
      out[c] = c in out ? Math.max(out[c], n) : n;
    }
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

/** The one key a version is kept under: `<slug>/<LEVELID>-<length>`, whatever the language it was read in. */
export const versionKey = (slug: string, level: string, length: number): string => `${slug.replace(/\.[a-z]{2,3}$/, "")}/${level.toUpperCase()}-${length}`;

/** Any saved key (old lowercase level, `.es` language suffix) as its canonical form; anything else unchanged. */
export function canonicalKey(key: string): string {
  const v = parseVersionKey(key);
  return v ? versionKey(v.slug, v.level, v.length) : key;
}

/** A version key split into its parts. Accepts the older forms: a lowercase level and an optional language suffix on the slug. */
export function parseVersionKey(key: string): { slug: string; level: string; length: number } | null {
  const m = /^([a-z0-9-]+)(?:\.[a-z]{2,3})?\/([A-Za-z0-9]+)-(\d+)$/.exec(key);
  return m ? { slug: m[1], level: m[2].toUpperCase(), length: Number(m[3]) } : null;
}

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

/** The furthest anyone has got in a book across its versions: which level and length, and how far (page index and the version's length). */
export function furthest(all: Progress, slug: string): { level: string; length: number; index: number } | null {
  let best: { level: string; length: number; index: number; share: number } | null = null;
  for (const [key, index] of Object.entries(all)) {
    const v = parseVersionKey(key);
    if (!v || v.slug !== slug) continue;
    const length = v.length;
    const share = length > 0 ? (index + 1) / length : 0;
    if (!best || share > best.share) best = { level: v.level, length, index, share };
  }
  return best ? { level: best.level, length: best.length, index: best.index } : null;
}

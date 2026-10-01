import { storageKey } from "@/lib/brand";
import { notify, readRaw, writeRaw } from "@/lib/store/local";

/**
 * How the reader looks to this reader, kept on the device: the size of the text, whether the
 * three matched words are underlined, and whether the translation sits under each page without
 * having to tap. One small document.
 */
export const READER_PREFS_KEY = storageKey("reader");

export const TEXT_SIZES = { s: 17, m: 19, l: 22 } as const;
export type TextSize = keyof typeof TEXT_SIZES;
export interface ReaderPrefs { size: TextSize; colours: boolean; gloss: boolean }
export const DEFAULT_PREFS: ReaderPrefs = { size: "m", colours: true, gloss: false };

/** Never throws: anything unreadable is the defaults. */
export function parsePrefs(raw: string | null | undefined): ReaderPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return DEFAULT_PREFS;
    const o = v as Record<string, unknown>;
    return {
      size: o.size === "s" || o.size === "m" || o.size === "l" ? o.size : DEFAULT_PREFS.size,
      colours: typeof o.colours === "boolean" ? o.colours : DEFAULT_PREFS.colours,
      gloss: typeof o.gloss === "boolean" ? o.gloss : DEFAULT_PREFS.gloss,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(change: Partial<ReaderPrefs>): void {
  writeRaw(READER_PREFS_KEY, JSON.stringify({ ...parsePrefs(readRaw(READER_PREFS_KEY)), ...change }));
  notify();
}

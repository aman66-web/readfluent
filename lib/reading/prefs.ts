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
/** `check`: how many questions the quick check after every five pages asks (3, 5 or 10), 0 for never, null while the reader has not said (they are asked). `cheers`: whether Pluto cheers now and then. */
export type CheckPref = 0 | 3 | 5 | 10 | null;
export interface ReaderPrefs { size: TextSize; colours: boolean; gloss: boolean; check: CheckPref; cheers: boolean }
export const DEFAULT_PREFS: ReaderPrefs = { size: "m", colours: true, gloss: false, check: null, cheers: true };

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
      check: o.check === 0 || o.check === 3 || o.check === 5 || o.check === 10 ? o.check : null,
      cheers: typeof o.cheers === "boolean" ? o.cheers : DEFAULT_PREFS.cheers,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(change: Partial<ReaderPrefs>): void {
  writeRaw(READER_PREFS_KEY, JSON.stringify({ ...parsePrefs(readRaw(READER_PREFS_KEY)), ...change }));
  notify();
}

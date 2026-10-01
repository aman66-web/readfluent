import { CATEGORIES, type CategoryId } from "@/lib/content/limits";
import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import { DAILY_MINUTES, SCROLL_IDS, type ScrollId } from "./firstrun";
import { DEFAULT_LANGUAGE, isLanguage, type LanguageCode } from "./languages";

/**
 * What a reader said on the first run, kept as one small document on their device
 * (it becomes a `sync_docs` document in M8). Never throws on a bad value: a corrupt
 * answer must not crash a screen, so every field is checked and falls back to
 * "not answered".
 */

export const FOCUS_IDS = ["language", "classics", "words", "social"] as const;
export type FocusId = (typeof FOCUS_IDS)[number];

export const HEARD_IDS = [
  "tiktok", "instagram", "youtube", "friend", "appstore", "search", "x", "facebook", "reddit", "ad", "other",
] as const;
export type HeardId = (typeof HEARD_IDS)[number];

/** The longest "somewhere else" kept: a name, not an essay. */
export const HEARD_OTHER_MAX = 80;

export interface Answers {
  focus: FocusId[];
  heard: HeardId | null;
  heardOther: string;
  scroll: ScrollId | null;
  daily: number | null;
  pledged: boolean;
  /** The language they speak: the app and word meanings. */
  language: LanguageCode;
  /** The language they want to learn: the books. Null until chosen. */
  learn: LanguageCode | null;
  interests: CategoryId[];
}

export const NO_ANSWERS: Answers = {
  focus: [], heard: null, heardOther: "", scroll: null, daily: null, pledged: false, language: DEFAULT_LANGUAGE, learn: null, interests: [],
};

export const ANSWERS_KEY = storageKey("onboarding");

/** In the given order, each once, only the ids that exist. */
function tidy<T extends string>(order: readonly T[], v: unknown): T[] {
  return Array.isArray(v) ? order.filter((id) => v.includes(id)) : [];
}

/** What was typed, one line, trimmed and cut to length. */
export function cleanHeardOther(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, HEARD_OTHER_MAX);
}

export function parseAnswers(raw: string | null | undefined): Answers {
  if (!raw) return NO_ANSWERS;
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return NO_ANSWERS; }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return NO_ANSWERS;
  const o = v as Record<string, unknown>;
  const oneOf = <T extends string>(list: readonly T[], x: unknown): T | null => ((list as readonly unknown[]).includes(x) ? (x as T) : null);
  return {
    focus: tidy(FOCUS_IDS, o.focus),
    heard: oneOf(HEARD_IDS, o.heard),
    heardOther: typeof o.heardOther === "string" ? o.heardOther.slice(0, HEARD_OTHER_MAX) : "",
    scroll: oneOf(SCROLL_IDS, o.scroll),
    daily: typeof o.daily === "number" && (DAILY_MINUTES as readonly number[]).includes(o.daily) ? o.daily : null,
    pledged: o.pledged === true,
    language: isLanguage(o.language) ? o.language : DEFAULT_LANGUAGE,
    learn: isLanguage(o.learn) ? o.learn : null,
    interests: tidy(CATEGORIES.map((c) => c.id), o.interests),
  };
}

/** Merge a change into what is saved, and save it. Browser only. */
export function saveAnswers(patch: Partial<Answers>): void {
  const next = { ...parseAnswers(readRaw(ANSWERS_KEY)), ...patch };
  writeRaw(ANSWERS_KEY, JSON.stringify(next));
}

/** An id ticked or unticked, kept in the screen's order. */
export function toggleIn<T extends string>(order: readonly T[], list: readonly T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : order.filter((x) => x === id || list.includes(x));
}

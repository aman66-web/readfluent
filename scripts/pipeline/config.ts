import type { LevelKey } from "./types";

/**
 * The knobs of the pipeline. Models and prices are from the Claude API docs (checked 1 Oct 2026);
 * change them here and nowhere else.
 */
export const MODEL = "claude-opus-5-5";
export const PIPELINE_VERSION = "1";

/** USD per million tokens. A batch run costs half. */
export interface Price { input: number; output: number; cacheRead: number; cacheWrite: number }
export const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
};
export const BATCH_DISCOUNT = 0.5;

/** Thinking depth per step (output_config.effort). Thinking tokens are billed as output. */
export const EFFORT = { beats: "high", pages: "medium", fix: "medium", dictionary: "low", originality: "medium" } as const;

/** Beats written in one request. Five beats × five pages = 25 pages, small enough to stay well inside one response. */
export const BEATS_PER_UNIT = 5;

export interface LevelSpec {
  label: string;
  /** Sentences per page: exactly this many, in English and in Spanish. */
  sentences: number;
  /** The owner's sentence-length guide, in words. */
  guide: { min: number; max: number };
  /** What the validator accepts: the guide with a little room, so one long sentence does not cost a regeneration. */
  tolerance: { min: number; max: number };
  /** Words rarer than this (Zipf frequency) are too hard for the level; undefined = no ceiling. */
  rareBelow?: number;
  /** How many such words a page may have. */
  rareAllowed: number;
  /** Flesch–Kincaid grade the English page may not exceed / must reach. */
  maxGrade?: number;
  minGrade?: number;
  /** A page whose content words are all this common is too easy for the level. */
  tooEasyMeanZipf?: number;
}

export const LEVEL_SPECS: Record<LevelKey, LevelSpec> = {
  A: {
    label: "A1–A2", sentences: 1, guide: { min: 8, max: 14 }, tolerance: { min: 6, max: 16 },
    rareBelow: 3.2, rareAllowed: 0, maxGrade: 10,
  },
  B: {
    label: "B1–B2", sentences: 2, guide: { min: 12, max: 22 }, tolerance: { min: 9, max: 25 },
    rareBelow: 2.6, rareAllowed: 2, maxGrade: 12, minGrade: 2,
  },
  C: {
    label: "C1–C2", sentences: 3, guide: { min: 18, max: 35 }, tolerance: { min: 14, max: 40 },
    rareAllowed: 99, minGrade: 5.5, tooEasyMeanZipf: 5.35,
  },
};

/** Spanish is neutral Latin American. These are Spain-only choices the validator flags. */
export const SPAIN_ONLY = ["vosotros", "vosotras", "vuestro", "vuestra", "vuestros", "vuestras", "coger", "ordenador", "móvil", "zumo", "aparcar"];

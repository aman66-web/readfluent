import type { Cefr } from "@/lib/xp/levels";
import type { Question } from "../types";

/**
 * The level tests (owner, 4 Oct 2026): ten tests for each level A1 to C2, every level open to everyone. A test is a
 * run of small steps: read a passage and answer four questions, three vocabulary questions, two listening ones,
 * a sentence to type from dictation, a short piece of writing and two sentences to say aloud. Passing all ten
 * tests of a level is what earns the level (lib/tests/level/store.ts).
 */
export const TESTS_PER_LEVEL = 10;
export const isTestNumber = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= TESTS_PER_LEVEL;

/** What a test is made of, in the order it is asked. */
export type Part = "read" | "vocab" | "listen" | "dictate" | "write" | "speak";

export interface Passage { title: string; text: string }

export type Step =
  /** One question about the passage; the passage stays above it. */
  | { part: "read"; passage: Passage; q: string; options: string[]; answer: number }
  | { part: "vocab"; question: Question }
  | { part: "listen"; question: Question }
  /** Hear a sentence and type it. */
  | { part: "dictate"; say: string }
  /** Write a short answer about the passage; the words in `keys` are what a good answer uses. */
  | { part: "write"; prompt: string; min: number; keys: string[]; passage: Passage }
  /** Say a sentence of the passage aloud. */
  | { part: "speak"; text: string };

export interface LevelTest { lang: string; level: Cefr; n: number; steps: Step[] }

/** What each step is worth. */
export const stepPoints = (s: Step): number => (s.part === "write" ? 2 : 1);

/** The share of the points that passes a test. */
export const LEVEL_TEST = { passShare: 0.7 } as const;

/** The points that pass out of `total` (never zero for a test with points). */
export const levelPassMark = (total: number): number => Math.ceil(total * LEVEL_TEST.passShare - 1e-9);

/** The points a run of steps is out of. */
export const stepsTotal = (steps: readonly Step[]): number => steps.reduce((x, s) => x + stepPoints(s), 0);

/**
 * A test without its speaking (App Review, 15 Oct 2026). Where nothing can hear the reader (inside the iPhone and Android
 * apps, and in a browser with no speech recognition: lib/reading/listen.ts) the sentences to say aloud are not asked at
 * all, rather than shown and failed, and the test is marked out of what is left: 12 points instead of 14, 70% still passes.
 */
export const withoutSpeaking = (test: LevelTest): LevelTest => ({ ...test, steps: test.steps.filter((s) => s.part !== "speak") });

/** One step as the score counts it. A step left out (speaking that could not be heard) has no entry: neither a point nor a miss. */
export interface Marked { part: Part; points: number; max: number }

/** The score of a run: the points got, out of the points of the steps actually asked, and whether that passes. */
export function scoreRun(marked: readonly Marked[]): { points: number; max: number; passed: boolean } {
  const points = marked.reduce((x, d) => x + d.points, 0);
  const max = marked.reduce((x, d) => x + d.max, 0);
  return { points, max, passed: max > 0 && points >= levelPassMark(max) };
}

/** A passage as written (English source: lib/tests/reading/en.json) joined with its translation. */
export interface LevelPassage {
  title: string;
  text: string;
  keys: string[];
  /** The questions about it, in English, for every language. */
  qs: { q: string; o: string[]; a: number }[];
  write: { prompt: string; min: number };
}

/**
 * The level exams (owner, 2 Oct 2026). Having the XP for the next level is not enough to move up: the reader
 * must also pass that level's exam, a hard one of about thirty minutes. Until they do, their level (and the XP
 * that shows) is held at the top of the level they are in; what they earn meanwhile is kept and counts the
 * moment they pass. Pure rules here; the paper comes from lib/tests/build.ts, the screen is components/tests/ExamRunner.tsx.
 */
import { CEFR, LEVEL_FLOOR, type Cefr } from "./levels";

export const EXAM = {
  /** Questions in the paper (a mixed one, from the level's whole band and the harder end of it). */
  questions: 40,
  /** The clock: a little under a minute a question. */
  minutes: 30,
  /** The share right that passes. Deliberately high: the exam is the gate, and practice tests are for practice. */
  passShare: 0.75,
  /** Fewer questions than this and a language has no real exam: it is not gated. */
  minQuestions: 24,
} as const;

/** The levels that have an exam to enter: every level above A1. */
export const EXAM_LEVELS: readonly Cefr[] = CEFR.slice(1);

/**
 * Which levels a language can examine, which is as far as it has material for: Spanish and English have
 * sentence banks for every level; every other language has its phrase deck, enough for the A2 exam only.
 * A level without an exam is not gated: nobody is held at a door that cannot be opened.
 */
export function gatedLevelsFor(lang: string | null | undefined): Cefr[] {
  if (!lang) return [];
  if (lang === "es" || lang === "en") return [...EXAM_LEVELS];
  if (/^[a-z]{2}$/.test(lang)) return ["A2"];
  return [];
}

export const isExamLevel = (v: unknown): v is Cefr => (EXAM_LEVELS as readonly unknown[]).includes(v);

/** The pass mark as a whole number of questions. */
export const passMark = (total: number): number => Math.ceil(total * EXAM.passShare - 1e-9);
export const examPassed = (correct: number, total: number): boolean => total >= EXAM.minQuestions && correct >= passMark(total);

/** What the ledger says about the gates: the levels that need an exam, those passed, and where the reader started. */
export interface Gates { base: number; raw: number; gates?: readonly Cefr[]; exams?: readonly Cefr[] }

/** The first level whose XP the reader has but whose exam they have not passed; null if none. */
export function pendingExam({ base, raw, gates, exams }: Gates): Cefr | null {
  if (!gates?.length) return null;
  for (const level of EXAM_LEVELS) {
    if (LEVEL_FLOOR[level] <= base) continue; // started at or above it: placed there, no exam to take
    if (!gates.includes(level) || exams?.includes(level)) continue;
    if (raw >= LEVEL_FLOOR[level]) return level;
    return null; // levels come in order: a gap below means nothing above counts yet
  }
  return null;
}

/** The XP that counts: all of it, but held one short of the level whose exam is pending. */
export function heldXp(g: Gates): number {
  const level = pendingExam(g);
  return level ? Math.min(g.raw, LEVEL_FLOOR[level] - 1) : g.raw;
}

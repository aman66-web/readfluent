import { storageKey } from "@/lib/brand";
import { readRaw, subscribeTo, writeRaw } from "@/lib/store/local";
import { isExamLevel } from "@/lib/xp/exam";
import { CEFR, type Cefr } from "@/lib/xp/levels";
import { passExam } from "@/lib/xp/ledger";
import { TESTS_PER_LEVEL, levelPassMark } from "./types";

/**
 * How the level tests have gone, on the device: for each language, level and test number the best score and whether it
 * has ever been passed. A level is earned when all ten of its tests are passed; that also opens the level in the XP
 * ladder (the same gate the old level exam was: lib/xp/exam.ts).
 */
export const LEVEL_TESTS_KEY = storageKey("level-tests");
export const subscribeLevelTests = subscribeTo(LEVEL_TESTS_KEY);

export interface LevelResult { points: number; total: number; passed: boolean; plays: number; at: number }
export type LevelResults = Record<string, LevelResult>;

export const levelResultKey = (lang: string, level: Cefr, n: number): string => `${lang}:${level}:${n}`;

export function parseLevelResults(raw: string | null | undefined): LevelResults {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
    const out: LevelResults = {};
    for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
      const x = r as Partial<LevelResult>;
      if (typeof x?.points === "number" && typeof x.total === "number" && x.total > 0) {
        out[k] = { points: Math.max(0, Math.min(Math.floor(x.points), Math.floor(x.total))), total: Math.floor(x.total), passed: x.passed === true, plays: Math.max(1, Math.floor(x.plays ?? 1)), at: Number(x.at) || 0 };
      }
    }
    return out;
  } catch { return {}; }
}

/** How many of a level's ten tests have been passed. */
export const passedCount = (results: LevelResults, lang: string, level: Cefr): number =>
  Array.from({ length: TESTS_PER_LEVEL }, (_, i) => results[levelResultKey(lang, level, i + 1)]?.passed).filter(Boolean).length;

/** The levels a language has all ten tests passed for. */
export const earnedLevels = (results: LevelResults, lang: string): Cefr[] => CEFR.filter((l) => passedCount(results, lang, l) === TESTS_PER_LEVEL);

/**
 * Records a finished test: the best score is kept, and a pass stays a pass. Returns whether this try passed and whether it
 * completed the level (the tenth pass), which also opens the level for the reader.
 */
export function saveLevelResult(lang: string, level: Cefr, n: number, points: number, total: number): { passed: boolean; earnedLevel: boolean } {
  const all = parseLevelResults(readRaw(LEVEL_TESTS_KEY));
  const k = levelResultKey(lang, level, n);
  const old = all[k];
  const passed = points >= levelPassMark(total);
  const better = !old || points / total > old.points / old.total;
  const before = passedCount(all, lang, level);
  all[k] = { points: better ? points : old.points, total: better ? total : old.total, passed: passed || !!old?.passed, plays: (old?.plays ?? 0) + 1, at: Date.now() };
  writeRaw(LEVEL_TESTS_KEY, JSON.stringify(all));
  const after = passedCount(all, lang, level);
  const earnedLevel = before < TESTS_PER_LEVEL && after === TESTS_PER_LEVEL;
  if (after === TESTS_PER_LEVEL && isExamLevel(level)) passExam(level);
  return { passed, earnedLevel };
}

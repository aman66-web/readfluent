import { storageKey } from "@/lib/brand";
import { readRaw, subscribeTo, writeRaw } from "@/lib/store/local";
import { isExamLevel } from "@/lib/xp/exam";
import type { Cefr } from "@/lib/xp/levels";

/** How the level exams have gone, kept on the device: for each level, the best try, how many tries, and the last. */
export const EXAMS_KEY = storageKey("exams");
export const subscribeExams = subscribeTo(EXAMS_KEY);

export interface ExamTry { correct: number; total: number; at: number }
export interface ExamRecord { tries: number; best: ExamTry; last: ExamTry }
export type ExamRecords = Partial<Record<Cefr, ExamRecord>>;

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const tryOf = (v: unknown): ExamTry | null => {
  const x = v as Partial<ExamTry> | null;
  return x && typeof x === "object" && num(x.total) > 0 ? { correct: Math.min(num(x.correct), num(x.total)), total: num(x.total), at: num(x.at) } : null;
};

export function parseExams(raw: string | null | undefined): ExamRecords {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Record<string, Partial<ExamRecord>> | null;
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: ExamRecords = {};
    for (const [k, r] of Object.entries(v)) {
      const best = tryOf(r?.best);
      const last = tryOf(r?.last);
      if (isExamLevel(k) && best && last) out[k] = { tries: Math.max(1, num(r?.tries)), best, last };
    }
    return out;
  } catch { return {}; }
}

/** Records one try at a level's exam. */
export function saveExam(level: Cefr, correct: number, total: number): void {
  const all = parseExams(readRaw(EXAMS_KEY));
  const now: ExamTry = { correct, total, at: Date.now() };
  const old = all[level];
  const better = !old || correct / total > old.best.correct / old.best.total;
  all[level] = { tries: (old?.tries ?? 0) + 1, best: better ? now : old.best, last: now };
  writeRaw(EXAMS_KEY, JSON.stringify(all));
}

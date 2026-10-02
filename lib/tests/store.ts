import { storageKey } from "@/lib/brand";
import { readRaw, subscribeTo, writeRaw } from "@/lib/store/local";
import type { Cefr } from "@/lib/xp/levels";
import type { TestKind } from "./types";

/** How the reader got on in each test, kept on the device: the best score of each paper and how often it was played. */
export const TESTS_KEY = storageKey("tests");
export const subscribeTests = subscribeTo(TESTS_KEY);

export interface Result { best: number; total: number; plays: number; at: number }
export type Results = Record<string, Result>;

export const resultKey = (lang: string, level: Cefr, kind: TestKind): string => `${lang}:${level}:${kind}`;

export function parseResults(raw: string | null | undefined): Results {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
    const out: Results = {};
    for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
      const x = r as Partial<Result>;
      if (typeof x?.best === "number" && typeof x.total === "number" && x.total > 0) out[k] = { best: Math.max(0, Math.floor(x.best)), total: Math.floor(x.total), plays: Math.max(1, Math.floor(x.plays ?? 1)), at: Number(x.at) || 0 };
    }
    return out;
  } catch { return {}; }
}

/** Records a finished test: the best score is kept. */
export function saveResult(lang: string, level: Cefr, kind: TestKind, correct: number, total: number): void {
  const all = parseResults(readRaw(TESTS_KEY));
  const k = resultKey(lang, level, kind);
  const old = all[k];
  const better = !old || correct / total > old.best / old.total;
  all[k] = { best: better ? correct : old.best, total: better ? total : old.total, plays: (old?.plays ?? 0) + 1, at: Date.now() };
  writeRaw(TESTS_KEY, JSON.stringify(all));
}

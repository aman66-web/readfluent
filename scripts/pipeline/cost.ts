import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BATCH_DISCOUNT, MODEL, PRICES } from "./config";
import { NO_USAGE, type Usage } from "./types";

/** What one request cost, from its token counts and the price table. */
export function costOf(u: Usage, model = MODEL, batch = false): number {
  const p = PRICES[model];
  if (!p) throw new Error(`no price for model ${model}`);
  const usd = (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1_000_000;
  return batch ? usd * BATCH_DISCOUNT : usd;
}

export interface StageTotals { requests: number; usage: Usage; usd: number }
export interface LedgerFile { model: string; stages: Record<string, StageTotals>; byBook: Record<string, number>; totalUsd: number }

/** Spend so far, kept on disk so a resumed run adds to it, and a budget that stops the run before it is passed. */
export class Ledger {
  private data: LedgerFile;
  constructor(private file: string, readonly budgetUsd: number, private model = MODEL) {
    this.data = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { model, stages: {}, byBook: {}, totalUsd: 0 };
  }
  get totalUsd(): number { return this.data.totalUsd; }
  get snapshot(): LedgerFile { return this.data; }
  add(stage: string, book: string, usage: Usage, batch: boolean): number {
    const usd = costOf(usage, this.model, batch);
    const s = (this.data.stages[stage] ??= { requests: 0, usage: { ...NO_USAGE }, usd: 0 });
    s.requests += 1;
    s.usage.input += usage.input; s.usage.output += usage.output; s.usage.cacheRead += usage.cacheRead; s.usage.cacheWrite += usage.cacheWrite;
    s.usd += usd;
    this.data.byBook[book] = (this.data.byBook[book] ?? 0) + usd;
    this.data.totalUsd += usd;
    return usd;
  }
  /** True when `more` dollars would take the run past the budget. */
  wouldExceed(more: number): boolean { return this.budgetUsd > 0 && this.data.totalUsd + more > this.budgetUsd; }
  save(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }
}

export const fmtUsd = (n: number): string => `$${n.toFixed(n < 10 ? 3 : 2)}`;

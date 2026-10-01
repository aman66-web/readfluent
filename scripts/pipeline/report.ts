import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BATCH_DISCOUNT, LEVEL_SPECS, MODEL } from "./config";
import { fmtUsd, type LedgerFile } from "./cost";
import type { BookReport } from "./finalize";
import { loadBeats, loadUnit, CHUNKS, type Ctx } from "./stages";
import { LEVELS, type CatalogueBook } from "./types";

const total = (l: LedgerFile) => Object.values(l.stages).reduce((n, s) => n + s.requests, 0);

/** The pilot report the owner asked for: sample pages at every level, the validation results, real token use, and the projected cost of all 200 books. */
export function writePilotReport(ctx: Ctx, books: CatalogueBook[], reports: BookReport[], ledger: LedgerFile, wasBatch: boolean, catalogueSize = 200): string {
  const L: string[] = [];
  const done = reports.filter((r) => r.result === "pass" || r.result === "flags" || r.result === "fail");
  L.push(`# Pilot report`, ``, `Model \`${MODEL}\`, ${wasBatch ? "Message Batches API (half price)" : "standard API"}. ${books.length} books.`, ``);

  L.push(`## Validation`, ``, `| Book | Result | Hard failures | CEFR flags | Notes |`, `| --- | --- | --- | --- | --- |`);
  for (const r of reports) L.push(`| ${r.id} | **${r.result}** | ${r.hard.length} | ${r.soft.length} | ${(r.halted ?? r.flags.join("; ")) || ""} |`);
  L.push(``);
  for (const r of reports) {
    if (r.hard.length) { L.push(`### Hard failures: ${r.id}`, ...r.hard.slice(0, 15).map((i) => `- ${i.where ?? ""} ${i.code}: ${i.message}`), ``); }
    if (r.soft.length) { L.push(`### CEFR flags still open: ${r.id}`, ...r.soft.slice(0, 15).map((i) => `- ${i.where ?? ""} ${i.code}: ${i.message}`), ``); }
  }

  L.push(`## Sample pages`, ``);
  for (const book of books) {
    const sheet = loadBeats(ctx, book.id);
    if (!sheet) continue;
    L.push(`### ${book.title} (${book.type})`, ``);
    for (const level of LEVELS) {
      L.push(`**${LEVEL_SPECS[level].label}**`, ``);
      for (const beat of [1, 25, 50]) {
        const chunk = Math.ceil(beat / 5);
        const pages = (loadUnit(ctx, book.id, level, chunk) ?? []).filter((p) => p.beat === beat && (p.slot === "c1" || p.slot === "x1"));
        for (const p of pages) L.push(`- beat ${p.beat} ${p.slot}`, `  - EN: ${p.en}`, `  - ES: ${p.es}`, `  - keys: ${p.keys.map((k) => `${k.es} = ${k.en}`).join(", ")}`);
      }
      L.push(``);
    }
  }

  L.push(`## Token use and cost`, ``, `| Step | Requests | Input | Cache read | Cache write | Output | Cost |`, `| --- | --- | --- | --- | --- | --- | --- |`);
  for (const [stage, s] of Object.entries(ledger.stages)) L.push(`| ${stage} | ${s.requests} | ${s.usage.input.toLocaleString()} | ${s.usage.cacheRead.toLocaleString()} | ${s.usage.cacheWrite.toLocaleString()} | ${s.usage.output.toLocaleString()} | ${fmtUsd(s.usd)} |`);
  L.push(`| **all** | ${total(ledger)} | | | | | **${fmtUsd(ledger.totalUsd)}** |`, ``);

  const n = Math.max(1, done.length);
  const perBook = ledger.totalUsd / n;
  const std = wasBatch ? perBook / BATCH_DISCOUNT : perBook;
  const bat = wasBatch ? perBook : perBook * BATCH_DISCOUNT;
  L.push(`## Projected cost for ${catalogueSize} books`, ``,
    `Measured: ${fmtUsd(ledger.totalUsd)} for ${done.length} books, ${fmtUsd(perBook)} a book (thinking tokens are included in output).`, ``,
    `| | Per book | ${catalogueSize} books |`, `| --- | --- | --- |`,
    `| Standard API | ${fmtUsd(std)} | ${fmtUsd(std * catalogueSize)} |`,
    `| Message Batches API (half price) | ${fmtUsd(bat)} | ${fmtUsd(bat * catalogueSize)} |`, ``,
    `Per book, by title:`, ...Object.entries(ledger.byBook).map(([id, usd]) => `- ${id}: ${fmtUsd(usd)}`), ``,
    `The word cards are shared by all books, so the dictionary cost per book falls as the library grows; the figures above charge each book its full share, which makes them an upper bound.`);
  mkdirSync(ctx.paths.reports, { recursive: true });
  const file = join(ctx.paths.reports, "pilot.md");
  writeFileSync(file, L.join("\n"));
  return file;
}
export { CHUNKS };

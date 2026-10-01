#!/usr/bin/env -S npx tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { loadCatalogue } from "./catalogue";
import { BATCH_DISCOUNT, LEVEL_SPECS, MODEL } from "./config";
import { Ledger, fmtUsd } from "./cost";
import { MockExecutor } from "./llm";
import { dictFile, flaggedPages, loadBeats, loadDictionary, loadOriginality, loadUnit, readStatus, type Ctx } from "./stages";
import { DEFAULT_PATHS } from "./store";
import { LEVELS } from "./types";
import { dictEntryIssues } from "./validate";

/**
 * A report on a partial run (PIPELINE_CHUNKS=1, answers written by hand through --mode files): what the
 * checks say about the pages and word cards that exist, the originality verdicts, samples, and what the
 * token counts in reports/cost.json (estimated from sizes) project to for the whole catalogue.
 *   PIPELINE_CHUNKS=1 npx tsx scripts/pipeline/rehearsal-report.ts <book-id>...
 */
const ids = process.argv.slice(2);
const books = loadCatalogue().filter((b) => ids.includes(b.id));
const paths = DEFAULT_PATHS;
const ledger = new Ledger(`${paths.reports}/cost.json`, 0);
const ctx: Ctx = { exec: new MockExecutor(() => null), ledger, paths, log: () => {} };
const L: string[] = ["# Rehearsal report", ""];

L.push("## Beat sheets and originality", "");
for (const b of books) {
  const sheet = loadBeats(ctx, b.id);
  const checks = loadOriginality(ctx, b.id);
  L.push(`- **${b.title}** (${b.type}): ${sheet ? `${sheet.beats.length} beats` : "no beat sheet"}${sheet?.public_domain ? `; public domain: ${sheet.public_domain.status}` : ""}${readStatus(ctx, b.id).halted ? `; HALTED: ${readStatus(ctx, b.id).halted}` : ""}`);
  checks.forEach((c, i) => L.push(`  - editor check ${i + 1} (${c.at}): **${c.result.verdict}**, ${c.result.findings.length} findings (${c.result.findings.filter((f) => f.severity !== "low").length} high or medium)`));
}

L.push("", "## Pages", "", "| Book | Level | Pages written | Still flagged |", "| --- | --- | --- | --- |");
const flagged = flaggedPages(ctx, books);
for (const b of books) for (const level of LEVELS) {
  const n = (loadUnit(ctx, b.id, level, 1) ?? []).length;
  const f = flagged.filter((x) => x.book.id === b.id && x.level === level);
  L.push(`| ${b.id} | ${LEVEL_SPECS[level].label} | ${n} | ${f.length} |`);
}
if (flagged.length) { L.push("", "Flags:"); for (const f of flagged.slice(0, 30)) L.push(`- ${f.book.id} ${f.level} beat ${f.page.beat} ${f.page.slot}: ${f.issues.map((i) => `${i.code} (${i.message})`).join("; ")}`); }

const dict = loadDictionary(ctx);
const bad = Object.keys(dict).filter((w) => dictEntryIssues(w, dict[w]).length);
L.push("", "## Word cards", "", `${Object.keys(dict).length} cards in ${dictFile(ctx)}; ${bad.length} fail a check.`);

L.push("", "## Sample pages", "");
for (const b of books) {
  L.push(`### ${b.title}`, "");
  for (const level of LEVELS) {
    L.push(`**${LEVEL_SPECS[level].label}**`, "");
    for (const p of (loadUnit(ctx, b.id, level, 1) ?? []).filter((x) => (x.beat === 1 && x.slot === "c1") || (x.beat === 3 && (x.slot === "p50" || x.slot === "x1")))) {
      L.push(`- beat ${p.beat} ${p.slot}`, `  - EN: ${p.en}`, `  - ES: ${p.es}`, `  - keys: ${p.keys.map((k) => `${k.es} = ${k.en}`).join(", ")}`);
    }
    L.push("");
  }
}

const s = ledger.snapshot.stages;
const per = (stage: string) => (s[stage] && s[stage].requests ? s[stage].usd / s[stage].requests : 0);
L.push("## Cost (estimated from sizes; not API token counts)", "", "| Step | Requests | Input tokens | Output tokens | Cost |", "| --- | --- | --- | --- | --- |");
for (const [k, v] of Object.entries(s)) L.push(`| ${k} | ${v.requests} | ${v.usage.input.toLocaleString()} | ${v.usage.output.toLocaleString()} | ${fmtUsd(v.usd)} |`);
const pagesPerUnit = per("pages");
const perBook = pagesPerUnit * 30 + per("beats") * 1.7 + per("originality") * 3 + per("dictionary") * 3 + 0.3;
L.push("", `Model ${MODEL}. One book is 30 page requests, 1 beat sheet (about 1.7 with rewrites for an original), about 3 editor checks and a share of the word cards.`,
  `Average page request here: ${fmtUsd(pagesPerUnit)}. Projected per book with no thinking overhead: **${fmtUsd(perBook)}** standard, **${fmtUsd(perBook * BATCH_DISCOUNT)}** with the Batches API; for 200 books **${fmtUsd(perBook * 200)}** standard, **${fmtUsd(perBook * 200 * BATCH_DISCOUNT)}** batch.`,
  `If thinking doubles the output tokens (the model thinks before it writes, billed as output): ${fmtUsd(perBook * 1.8 * 200)} standard, ${fmtUsd(perBook * 1.8 * 200 * BATCH_DISCOUNT)} batch. The real pilot replaces this guess with measured numbers.`);

mkdirSync(paths.reports, { recursive: true });
writeFileSync(`${paths.reports}/rehearsal.md`, L.join("\n"));
console.log(L.join("\n"));

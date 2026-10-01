#!/usr/bin/env -S npx tsx
import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync } from "node:fs";
import { loadCatalogue } from "./catalogue";
import { Ledger, fmtUsd } from "./cost";
import { BatchExecutor, FileExecutor, PendingAnswers, SyncExecutor, type Executor } from "./llm";
import { finalizeAll } from "./finalize";
import { writePilotReport } from "./report";
import { BudgetStop, stageBeats, stageBeatsOriginality, stageDictionary, stageFix, stageOriginality, stagePages, type Ctx } from "./stages";
import { DEFAULT_PATHS } from "./store";

/** The three books of the pilot. */
const PILOT = ["pride-and-prejudice", "the-rival-at-desk-four", "one-small-step-a-day"];

const HELP = `ReadFluent book pipeline

  npx tsx scripts/pipeline/run.ts --pilot                     the 3 pilot books, standard API
  npx tsx scripts/pipeline/run.ts --books a,b --mode batch    chosen books, Message Batches API (half price)
  npx tsx scripts/pipeline/run.ts --all --mode batch --budget 600

  --budget <usd>   stop before spending more than this (default 25); resume by running the same command again
  --mode sync|batch|files  how requests are sent (default sync); files = no API, answers are written by hand
  --concurrency n  parallel requests in sync mode (default 4)
  --stage <name>   run one stage only: beats | pages | fix | dictionary | originality | finalize
  --plan           print what would be asked, send nothing

Needs ANTHROPIC_API_KEY. Everything is written under content/, dictionary/, reports/ and review/, with working files in .pipeline-work/.
A piece that already exists on disk is skipped, so a stopped run resumes where it stopped.`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main(): Promise<number> {
  if (flag("help") || process.argv.length < 3) { console.log(HELP); return 0; }
  const catalogue = loadCatalogue();
  const ids = flag("all") ? catalogue.map((b) => b.id) : flag("pilot") ? PILOT : (arg("books") ?? "").split(",").filter(Boolean);
  const books = ids.map((id) => {
    const b = catalogue.find((x) => x.id === id);
    if (!b) throw new Error(`no book "${id}" in the catalogue`);
    return b;
  });
  if (books.length === 0) { console.log(HELP); return 1; }

  const paths = DEFAULT_PATHS;
  mkdirSync(paths.work, { recursive: true });
  const budget = Number(arg("budget") ?? 25);
  const mode = (arg("mode") ?? "sync") as "sync" | "batch" | "files";
  const ledger = new Ledger(`${paths.reports}/cost.json`, budget);

  if (flag("plan")) {
    const requests = books.length * (1 + 30) + Math.ceil((books.length * 90) / 6);
    console.log(`${books.length} books → about ${requests} requests plus word cards and checks. Budget ${fmtUsd(budget)}. Mode ${mode}. Nothing sent.`);
    return 0;
  }
  if (mode !== "files" && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error("No ANTHROPIC_API_KEY in the environment. Create a key at console.anthropic.com, export it, and run again.");
    return 1;
  }

  const exec: Executor = mode === "files" ? new FileExecutor(`${paths.work}/_files`)
    : mode === "batch" ? new BatchExecutor(new Anthropic(), paths.work) : new SyncExecutor(new Anthropic(), Number(arg("concurrency") ?? 4));
  const ctx: Ctx = { exec, ledger, paths, log: (l) => console.log(l) };
  const only = arg("stage");
  const want = (s: string) => !only || only === s;

  try {
    if (want("beats")) { await stageBeats(ctx, books); await stageBeatsOriginality(ctx, books); }
    if (want("pages")) await stagePages(ctx, books);
    if (want("fix")) await stageFix(ctx, books);
    if (want("dictionary")) await stageDictionary(ctx, books);
    if (want("originality")) await stageOriginality(ctx, books);
  } catch (e) {
    if (e instanceof PendingAnswers) { console.error(`\n${e.message}. Requests are in ${paths.work}/_files/requests; write each answer to ${paths.work}/_files/answers/<same name>.json, then run the same command again.`); return 3; }
    if (e instanceof BudgetStop) { console.error(`\n${e.message}\nRun the same command again to continue.`); ledger.save(); return 2; }
    throw e;
  }
  if (want("finalize")) {
    const { reports, unresolved } = finalizeAll(ctx, books);
    const file = writePilotReport(ctx, books, reports, ledger.snapshot, exec.batch);
    console.log(`\n${reports.map((r) => `${r.id}: ${r.result}`).join("\n")}\n${unresolved} pages still flagged.\nSpent ${fmtUsd(ledger.totalUsd)}. Report: ${file}`);
  }
  return 0;
}

main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });

import { existsSync } from "node:fs";
import { isHealth } from "./catalogue";
import { BEATS_PER_UNIT } from "./config";
import { Ledger, fmtUsd } from "./cost";
import type { Executor, LlmRequest, LlmResult } from "./llm";
import {
  BEATS_SCHEMA, DICT_SCHEMA, DICT_SYSTEM, ORIGINALITY_SCHEMA, ORIGINALITY_SYSTEM, UNIT_SCHEMA,
  beatsRequest, bookContext, dictUser, fixUser, originalityUser, pagesSystem, pagesUser,
} from "./prompts";
import { DISCLAIMERS } from "./assemble";
import { readJson, writeJson, bookWork, type Paths } from "./store";
import { BEATS, LEVELS, SLOTS, type BeatSheet, type CatalogueBook, type Dictionary, type Issue, type LevelKey, type UnitPage } from "./types";
import { namesOf } from "./cefr";
import { dictEntryIssues, pageIssues } from "./validate";

/**
 * The stages of the run. Each one asks the model for what is missing on disk, checks what comes
 * back, asks again (up to three times) for what failed, and writes what passed. Run it again and
 * it picks up where it stopped.
 */

export const MAX_ATTEMPTS = 3;

export interface Ctx {
  exec: Executor;
  ledger: Ledger;
  paths: Paths;
  log: (line: string) => void;
}

export class BudgetStop extends Error {}

/** What a request of each stage costs on average, used before there is any history to average. */
const GUESS_USD: Record<string, number> = { beats: 0.5, pages: 0.35, fix: 0.15, dictionary: 0.1, originality: 0.15 };

async function ask(ctx: Ctx, key: string, requests: LlmRequest[]): Promise<LlmResult[]> {
  if (requests.length === 0) return [];
  const stage = requests[0].stage;
  const s = ctx.ledger.snapshot.stages[stage];
  const per = s && s.requests > 0 ? s.usd / s.requests : GUESS_USD[stage] ?? 0.3;
  const estimate = per * requests.length * (ctx.exec.batch ? 1 : 2);
  if (ctx.ledger.wouldExceed(estimate)) {
    throw new BudgetStop(`stopping before ${requests.length} ${stage} requests (about ${fmtUsd(estimate)}): ${fmtUsd(ctx.ledger.totalUsd)} spent of a ${fmtUsd(ctx.ledger.budgetUsd)} budget`);
  }
  ctx.log(`  ${stage}: ${requests.length} request${requests.length === 1 ? "" : "s"}${ctx.exec.batch ? " (batch)" : ""}…`);
  const results = await ctx.exec.run(requests, key);
  const byId = new Map(requests.map((r) => [r.id, r]));
  for (const r of results) ctx.ledger.add(stage, byId.get(r.id)?.book ?? "?", r.usage, r.batch);
  ctx.ledger.save();
  return results;
}

/** Ask for every item, check each answer, and ask again for those that failed, up to three rounds. Returns the items that never passed. */
async function rounds<I>(
  ctx: Ctx, label: string, items: I[],
  make: (item: I, feedback: string | undefined) => LlmRequest,
  check: (item: I, json: unknown) => { ok: true } | { ok: false; feedback: string },
): Promise<{ item: I; feedback: string }[]> {
  let pending = items.map((item) => ({ item, feedback: undefined as string | undefined }));
  for (let round = 1; round <= MAX_ATTEMPTS && pending.length > 0; round++) {
    const requests = pending.map((p) => make(p.item, p.feedback));
    const results = await ask(ctx, `${label}-r${round}`, requests);
    const next: typeof pending = [];
    results.forEach((res, i) => {
      const item = pending[i].item;
      if (res.json === null) { next.push({ item, feedback: `the last answer could not be used (${res.error ?? "no answer"})` }); return; }
      const c = check(item, res.json);
      if (!c.ok) next.push({ item, feedback: c.feedback });
    });
    pending = next;
    if (pending.length) ctx.log(`  ${label}: ${pending.length} to try again after round ${round}`);
  }
  return pending.map((p) => ({ item: p.item, feedback: p.feedback ?? "no answer" }));
}

// ── beats ───────────────────────────────────────────────────────────────────

export function beatSheetIssues(sheet: BeatSheet): string[] {
  const out: string[] = [];
  if (!Array.isArray(sheet.beats) || sheet.beats.length !== BEATS) out.push(`there must be exactly ${BEATS} beats, there are ${sheet.beats?.length ?? 0}`);
  else sheet.beats.forEach((b, i) => {
    if (b.n !== i + 1) out.push(`beat ${i + 1} is numbered ${b.n}`);
    if (!b.summary?.trim() || !b.details?.trim()) out.push(`beat ${i + 1} needs a summary and details`);
  });
  if (!sheet.bible || sheet.bible.length < 200) out.push("the bible is missing or too thin");
  if (!sheet.title_es?.trim() || !sheet.blurb_en?.trim() || !sheet.blurb_es?.trim()) out.push("title_es, blurb_en and blurb_es are required");
  return out;
}

export interface BookStatus { halted?: string; flags?: string[] }
const statusFile = (ctx: Ctx, id: string) => bookWork(ctx.paths, id, "status.json");
export const readStatus = (ctx: Ctx, id: string): BookStatus => readJson<BookStatus>(statusFile(ctx, id)) ?? {};
function halt(ctx: Ctx, id: string, why: string): void {
  ctx.log(`  ! ${id}: halted: ${why}`);
  writeJson(statusFile(ctx, id), { ...readStatus(ctx, id), halted: why });
}

const beatsFile = (ctx: Ctx, id: string) => bookWork(ctx.paths, id, "beats.json");
export const loadBeats = (ctx: Ctx, id: string): BeatSheet | null => readJson<BeatSheet>(beatsFile(ctx, id));

export async function stageBeats(ctx: Ctx, books: CatalogueBook[]): Promise<void> {
  ctx.log("Beat sheets");
  const todo = books.filter((b) => !loadBeats(ctx, b.id) && !readStatus(ctx, b.id).halted);
  const failed = await rounds(ctx, "beats", todo,
    (b, feedback) => ({ id: `${b.id}/beats`, stage: "beats", book: b.id, system: [{ text: beatsRequest(b).system }], user: beatsRequest(b, feedback).user, schema: BEATS_SCHEMA, maxTokens: 24000 }),
    (b, json) => {
      const sheet = json as BeatSheet;
      const issues = beatSheetIssues(sheet);
      if (issues.length) return { ok: false, feedback: issues.join("; ") };
      if (b.type === "classic" && sheet.public_domain?.status !== "certain") {
        halt(ctx, b.id, `public domain status is not certain: ${sheet.public_domain?.reason ?? "no reason given"}. A person must decide.`);
        return { ok: true };
      }
      if (!readStatus(ctx, b.id).halted) writeJson(beatsFile(ctx, b.id), sheet);
      return { ok: true };
    });
  for (const f of failed) halt(ctx, f.item.id, `no valid beat sheet after ${MAX_ATTEMPTS} tries: ${f.feedback}`);
}

// ── page units ──────────────────────────────────────────────────────────────

export const CHUNKS = BEATS / BEATS_PER_UNIT;
/** For trying the prompts cheaply: PIPELINE_CHUNKS=1 writes only the first five beats of each level. A real run leaves it unset. */
const CHUNKS_RUN = Math.min(CHUNKS, Number(process.env.PIPELINE_CHUNKS ?? CHUNKS));
const unitFile = (ctx: Ctx, id: string, level: LevelKey, chunk: number) => bookWork(ctx.paths, id, `unit-${level}-${String(chunk).padStart(2, "0")}.json`);
export const loadUnit = (ctx: Ctx, id: string, level: LevelKey, chunk: number): UnitPage[] | null => readJson<{ pages: UnitPage[] }>(unitFile(ctx, id, level, chunk))?.pages ?? null;
const chunkRange = (chunk: number): [number, number] => [(chunk - 1) * BEATS_PER_UNIT + 1, chunk * BEATS_PER_UNIT];

/** Does an answer hold exactly the right pages: every beat of the chunk, every slot, once, with the right shapes? */
export function unitShapeIssues(pages: unknown, from: number, to: number): string[] {
  if (!Array.isArray(pages)) return ["the answer has no pages list"];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of pages as UnitPage[]) {
    if (typeof p?.es !== "string" || typeof p?.en !== "string" || !Array.isArray(p?.keys)) { out.push("a page is missing es, en or keys"); continue; }
    const key = `${p.beat}/${p.slot}`;
    if (!(p.beat >= from && p.beat <= to) || !SLOTS.includes(p.slot)) out.push(`unexpected page beat ${p.beat} slot ${p.slot}`);
    else if (seen.has(key)) out.push(`beat ${p.beat} slot ${p.slot} is written twice`);
    seen.add(key);
  }
  for (let b = from; b <= to; b++) for (const s of SLOTS) if (!seen.has(`${b}/${s}`)) out.push(`beat ${b} slot ${s} is missing`);
  return out;
}

const ordered = (pages: UnitPage[]): UnitPage[] => [...pages].sort((a, b) => a.beat - b.beat || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));

function pagesRequest(book: CatalogueBook, sheet: BeatSheet, level: LevelKey, chunk: number, feedback?: string): LlmRequest {
  const [from, to] = chunkRange(chunk);
  return {
    id: `${book.id}/${level}/${String(chunk).padStart(2, "0")}`, stage: "pages", book: book.id,
    // The book's context is the cached block: all thirty requests of a book share it.
    system: pagesSystem(level, bookContext(book, sheet)),
    user: pagesUser(level, sheet, from, to, feedback),
    schema: UNIT_SCHEMA, maxTokens: 32000,
  };
}

export async function stagePages(ctx: Ctx, books: CatalogueBook[]): Promise<void> {
  ctx.log("Pages");
  const items: { book: CatalogueBook; sheet: BeatSheet; level: LevelKey; chunk: number }[] = [];
  for (const book of books) {
    const sheet = loadBeats(ctx, book.id);
    if (!sheet || readStatus(ctx, book.id).halted) continue;
    for (const level of LEVELS) for (let chunk = 1; chunk <= CHUNKS_RUN; chunk++) if (!existsSync(unitFile(ctx, book.id, level, chunk))) items.push({ book, sheet, level, chunk });
  }
  const failed = await rounds(ctx, "pages", items,
    (it, feedback) => pagesRequest(it.book, it.sheet, it.level, it.chunk, feedback),
    (it, json) => {
      const [from, to] = chunkRange(it.chunk);
      const pages = (json as { pages?: UnitPage[] }).pages;
      const issues = unitShapeIssues(pages, from, to);
      if (issues.length) return { ok: false, feedback: issues.slice(0, 8).join("; ") };
      writeJson(unitFile(ctx, it.book.id, it.level, it.chunk), { pages: ordered(pages!) });
      return { ok: true };
    });
  for (const f of failed) halt(ctx, f.item.book.id, `level ${f.item.level} chunk ${f.item.chunk} failed: ${f.feedback}`);
}

// ── checking and fixing pages ───────────────────────────────────────────────

export interface FlaggedPage { book: CatalogueBook; sheet: BeatSheet; level: LevelKey; chunk: number; page: UnitPage; issues: Issue[] }

/** Every page of every finished unit that fails a check. */
export function flaggedPages(ctx: Ctx, books: CatalogueBook[]): FlaggedPage[] {
  const out: FlaggedPage[] = [];
  for (const book of books) {
    const sheet = loadBeats(ctx, book.id);
    if (!sheet) continue;
    const names = namesOf(sheet.bible);
    for (const level of LEVELS) for (let chunk = 1; chunk <= CHUNKS; chunk++) {
      for (const page of loadUnit(ctx, book.id, level, chunk) ?? []) {
        const issues = pageIssues(page, level, `beat ${page.beat} ${page.slot}`, names);
        if (issues.length) out.push({ book, sheet, level, chunk, page, issues });
      }
    }
  }
  return out;
}

const FIX_GROUP = 6;

async function fixPages(ctx: Ctx, label: string, flagged: { f: Omit<FlaggedPage, "issues">; problems: string[] }[]): Promise<void> {
  const groups = new Map<string, typeof flagged>();
  for (const x of flagged) {
    const key = `${x.f.book.id}/${x.f.level}/${x.f.chunk}`;
    groups.set(key, [...(groups.get(key) ?? []), x]);
  }
  const batches: { book: CatalogueBook; sheet: BeatSheet; level: LevelKey; chunk: number; items: typeof flagged; n: number }[] = [];
  for (const g of groups.values()) for (let i = 0; i < g.length; i += FIX_GROUP) batches.push({ ...g[0].f, items: g.slice(i, i + FIX_GROUP), n: i / FIX_GROUP });
  const results = await ask(ctx, label, batches.map((b) => ({
    id: `${b.book.id}/${b.level}/${String(b.chunk).padStart(2, "0")}/fix${b.n}`, stage: "fix" as const, book: b.book.id,
    system: pagesSystem(b.level, bookContext(b.book, b.sheet)),
    user: fixUser(b.level, b.sheet, b.items.map((x) => ({ page: x.f.page, problems: x.problems }))),
    schema: UNIT_SCHEMA, maxTokens: 16000,
  })));
  results.forEach((res, i) => {
    const b = batches[i];
    const pages = (res.json as { pages?: UnitPage[] } | null)?.pages;
    if (!Array.isArray(pages)) return;
    const unit = loadUnit(ctx, b.book.id, b.level, b.chunk);
    if (!unit) return;
    for (const np of pages) {
      const at = unit.findIndex((p) => p.beat === np.beat && p.slot === np.slot);
      if (at >= 0 && typeof np.es === "string" && typeof np.en === "string" && Array.isArray(np.keys)) unit[at] = { beat: np.beat, slot: np.slot, es: np.es, en: np.en, keys: np.keys };
    }
    writeJson(unitFile(ctx, b.book.id, b.level, b.chunk), { pages: ordered(unit) });
  });
}

/** Check every page; rewrite the ones that fail; do it up to three times. What is left is for the report. */
export async function stageFix(ctx: Ctx, books: CatalogueBook[]): Promise<void> {
  ctx.log("Checking pages");
  for (let round = 1; round <= MAX_ATTEMPTS; round++) {
    const flagged = flaggedPages(ctx, books);
    ctx.log(`  ${flagged.length} page${flagged.length === 1 ? "" : "s"} flagged${round > 1 ? ` after ${round - 1} fix round${round > 2 ? "s" : ""}` : ""}`);
    if (flagged.length === 0) return;
    await fixPages(ctx, `fix-r${round}`, flagged.map((f) => ({ f, problems: f.issues.map((i) => i.message) })));
  }
}

// ── dictionary ──────────────────────────────────────────────────────────────

export const dictFile = (ctx: Ctx) => `${ctx.paths.dictionary}/es.json`;
export const loadDictionary = (ctx: Ctx): Dictionary => readJson<Dictionary>(dictFile(ctx)) ?? {};
const DICT_BATCH = 60;

/** Every Spanish key word of the books, with a sentence it appears in. Health books also need the notice's words. */
export function wantedWords(ctx: Ctx, books: CatalogueBook[]): Map<string, { es: string; en: string }> {
  const out = new Map<string, { es: string; en: string }>();
  const add = (w: string, es: string, en: string) => { const k = w.toLowerCase(); if (!out.has(k)) out.set(k, { es, en }); };
  for (const book of books) {
    if (!loadBeats(ctx, book.id)) continue;
    for (const level of LEVELS) {
      for (let chunk = 1; chunk <= CHUNKS; chunk++) for (const p of loadUnit(ctx, book.id, level, chunk) ?? []) for (const k of p.keys) add(k.es, p.es, p.en);
      if (isHealth(book)) for (const k of DISCLAIMERS[level].keys) add(k.es, DISCLAIMERS[level].es, DISCLAIMERS[level].en);
    }
  }
  return out;
}

export async function stageDictionary(ctx: Ctx, books: CatalogueBook[]): Promise<void> {
  ctx.log("Word cards");
  const dict = loadDictionary(ctx);
  const wanted = wantedWords(ctx, books);
  let missing = [...wanted.keys()].filter((w) => dictEntryIssues(w, dict[w]).length > 0).sort();
  ctx.log(`  ${wanted.size} key words, ${missing.length} need a card`);
  for (let round = 1; round <= MAX_ATTEMPTS && missing.length > 0; round++) {
    const batches: string[][] = [];
    for (let i = 0; i < missing.length; i += DICT_BATCH) batches.push(missing.slice(i, i + DICT_BATCH));
    const results = await ask(ctx, `dictionary-r${round}`, batches.map((words, i) => ({
      id: `dictionary/${round}/${i}`, stage: "dictionary" as const, book: "(dictionary)", system: [{ text: DICT_SYSTEM }],
      user: dictUser(words.map((w) => ({ word: w, ...wanted.get(w)! }))), schema: DICT_SCHEMA, maxTokens: 16000,
    })));
    for (const res of results) {
      const entries = (res.json as { entries?: { word: string; ph: string; pos: string; mean: string; root: string }[] } | null)?.entries ?? [];
      for (const e of entries) {
        const w = String(e.word ?? "").toLowerCase();
        if (!wanted.has(w)) continue;
        const entry = { ph: e.ph, pos: e.pos, mean: e.mean, root: e.root };
        if (dictEntryIssues(w, entry).length === 0) dict[w] = entry;
      }
    }
    writeJson(dictFile(ctx), Object.fromEntries(Object.entries(dict).sort(([a], [b]) => a.localeCompare(b, "es"))));
    missing = missing.filter((w) => dictEntryIssues(w, dict[w]).length > 0);
  }
}

// ── originality ─────────────────────────────────────────────────────────────

export interface OriginalityFinding { beats: number[]; kind: string; severity: "high" | "medium" | "low"; detail: string }
export interface OriginalityResult { verdict: "pass" | "rewrite"; findings: OriginalityFinding[] }
const originalityFile = (ctx: Ctx, id: string) => bookWork(ctx.paths, id, "originality.json");
export const loadOriginality = (ctx: Ctx, id: string): { at: "beats" | "text"; result: OriginalityResult }[] => readJson(originalityFile(ctx, id)) ?? [];
const beatsChecked = (ctx: Ctx, id: string) => loadOriginality(ctx, id).some((r) => r.at === "beats" && r.result.verdict === "pass");

/** The C1–C2 core text, beat by beat: the richest version, so a copied phrase is easiest to see. */
export function originalityMaterial(ctx: Ctx, id: string): string {
  const lines: string[] = [];
  for (let chunk = 1; chunk <= CHUNKS; chunk++) for (const p of loadUnit(ctx, id, "C", chunk) ?? []) if (p.slot === "c1" || p.slot === "c2") lines.push(`[beat ${p.beat}] ${p.en}`);
  return lines.join("\n");
}

const flagText = (r: OriginalityResult) => r.findings.filter((f) => f.severity !== "low").map((f) => `${f.kind}${f.beats.length ? ` (beats ${f.beats.join(", ")})` : ""}: ${f.detail}`);

function checkRequest(book: CatalogueBook, material: string, what: "beat sheet" | "text", id: string): LlmRequest {
  return { id, stage: "originality", book: book.id, system: [{ text: ORIGINALITY_SYSTEM }], user: originalityUser(book, material, what), schema: ORIGINALITY_SCHEMA, maxTokens: 8000 };
}

function record(ctx: Ctx, id: string, at: "beats" | "text", result: OriginalityResult): void {
  writeJson(originalityFile(ctx, id), [...loadOriginality(ctx, id), { at, result }]);
}

const sheetText = (sheet: BeatSheet) => `${sheet.bible}\n\n${sheet.beats.map((b) => `${b.n}. ${b.summary}\n   ${b.details}`).join("\n")}`;

/**
 * Originals only, before any page is written: an editor compares the beat sheet with the work
 * that inspired it. If it is too close the beat sheet is written again, told what to change.
 */
export async function stageBeatsOriginality(ctx: Ctx, books: CatalogueBook[]): Promise<void> {
  ctx.log("Originality of the beat sheets");
  /** How many times this beat sheet has been checked, on disk, so a stopped run does not start counting again. */
  const tries = (id: string) => loadOriginality(ctx, id).filter((r) => r.at === "beats").length;
  for (let round = 1; round <= MAX_ATTEMPTS; round++) {
    const pending = books.filter((b) => b.type === "original" && loadBeats(ctx, b.id) && !readStatus(ctx, b.id).halted && !beatsChecked(ctx, b.id));
    if (pending.length === 0) return;
    const res = await ask(ctx, `beats-originality-r${round}`, pending.map((b) => checkRequest(b, sheetText(loadBeats(ctx, b.id)!), "beat sheet", `${b.id}/beats-originality/${tries(b.id) + 1}`)));
    const redo: CatalogueBook[] = [];
    res.forEach((r, i) => {
      const book = pending[i];
      const result = r.json as OriginalityResult | null;
      if (!result) return;
      record(ctx, book.id, "beats", result);
      if (result.verdict === "pass") return;
      if (tries(book.id) >= MAX_ATTEMPTS) { halt(ctx, book.id, `the beat sheet is still too close to the inspiration after ${MAX_ATTEMPTS} checks: ${flagText(result).join(" | ")}`); return; }
      writeJson(bookWork(ctx.paths, book.id, "feedback.json"), flagText(result));
      redo.push(book);
    });
    // Write the sent-back beat sheets again, with the editor's notes.
    if (redo.length) await rewriteBeats(ctx, redo);
  }
}

async function rewriteBeats(ctx: Ctx, books: CatalogueBook[]): Promise<void> {
  await rounds(ctx, "beats-rewrite", books,
    (b, feedback) => ({ id: `${b.id}/beats-rewrite`, stage: "beats", book: b.id, system: [{ text: beatsRequest(b).system }],
      user: beatsRequest(b, [...(readJson<string[]>(bookWork(ctx.paths, b.id, "feedback.json")) ?? []), feedback].filter(Boolean).join("\n")).user, schema: BEATS_SCHEMA, maxTokens: 24000 }),
    (b, json) => {
      const sheet = json as BeatSheet;
      const issues = beatSheetIssues(sheet);
      if (issues.length) return { ok: false, feedback: issues.join("; ") };
      writeJson(beatsFile(ctx, b.id), sheet);
      return { ok: true };
    });
}

/** Originals only, after the pages: the editor reads the finished C1–C2 text; the beats it names are rewritten at every level; then it reads again. */
export async function stageOriginality(ctx: Ctx, books: CatalogueBook[]): Promise<void> {
  ctx.log("Originality of the text");
  const tries = (id: string) => loadOriginality(ctx, id).filter((r) => r.at === "text").length;
  const lastPassed = (id: string) => loadOriginality(ctx, id).filter((r) => r.at === "text").at(-1)?.result.verdict === "pass";
  for (let round = 1; round <= MAX_ATTEMPTS; round++) {
    const pending = books.filter((b) => b.type === "original" && loadBeats(ctx, b.id) && !readStatus(ctx, b.id).halted && !lastPassed(b.id) && tries(b.id) < MAX_ATTEMPTS && !readStatus(ctx, b.id).flags?.some((f) => f.startsWith("originality")));
    if (pending.length === 0) return;
    const res = await ask(ctx, `originality-r${round}`, pending.map((b) => checkRequest(b, `${loadBeats(ctx, b.id)!.bible}\n\n${originalityMaterial(ctx, b.id)}`, "text", `${b.id}/originality/${tries(b.id) + 1}`)));
    const rewrite: { f: Omit<FlaggedPage, "issues">; problems: string[] }[] = [];
    const again: CatalogueBook[] = [];
    res.forEach((r, i) => {
      const book = pending[i];
      const result = r.json as OriginalityResult | null;
      if (!result) return;
      record(ctx, book.id, "text", result);
      if (result.verdict === "pass") return;
      const found = result.findings.filter((f) => f.severity !== "low");
      const beats = new Set(found.flatMap((f) => f.beats));
      if (tries(book.id) >= MAX_ATTEMPTS || beats.size === 0) {
        writeJson(statusFile(ctx, book.id), { ...readStatus(ctx, book.id), flags: [...(readStatus(ctx, book.id).flags ?? []), `originality: still too close to the inspiration: ${flagText(result).join(" | ")}`] });
        return;
      }
      again.push(book);
      const sheet = loadBeats(ctx, book.id)!;
      for (const level of LEVELS) for (let chunk = 1; chunk <= CHUNKS; chunk++) for (const page of loadUnit(ctx, book.id, level, chunk) ?? []) {
        if (!beats.has(page.beat)) continue;
        const why = found.filter((f) => f.beats.includes(page.beat)).map((f) => `too close to "${(book.inspired_by ?? []).join("; ")}" (${f.kind}): ${f.detail}. Rewrite this page with different names, events and wording while serving the same beat.`);
        rewrite.push({ f: { book, sheet, level, chunk, page }, problems: why });
      }
    });
    if (rewrite.length === 0) continue;
    ctx.log(`  ${rewrite.length} pages to rewrite for originality`);
    await fixPages(ctx, `originality-fix-r${round}`, rewrite);
    await stageFix(ctx, again);
  }
}

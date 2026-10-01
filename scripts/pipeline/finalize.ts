import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ALL_VERSIONS, buildLevel, buildMeta, reviewRank, versionFile } from "./assemble";
import { isHealth, nicheSlug } from "./catalogue";
import {
  CHUNKS, flaggedPages, loadBeats, loadDictionary, loadOriginality, loadUnit, readStatus, type Ctx,
} from "./stages";
import { writeJson } from "./store";
import { LENGTHS, LEVELS, type CatalogueBook, type Issue, type LevelKey, type Page, type UnitPage } from "./types";
import { namesOf } from "./cefr";
import { containmentIssues, dictionaryIssues, versionIssues } from "./validate";

/** CEFR and readability flags are judgement calls; every other code is a hard failure. */
const SOFT = new Set(["too-short", "too-long", "too-hard-words", "too-hard-grade", "too-easy-grade", "too-easy-words"]);

export type BookResult = "pass" | "flags" | "fail" | "halted" | "incomplete";
export interface BookReport {
  id: string;
  niche: string;
  result: BookResult;
  halted?: string;
  flags: string[];
  hard: Issue[];
  soft: Issue[];
  versions: Record<string, { pages: number; ok: boolean }>;
}

function levelUnits(ctx: Ctx, id: string, level: LevelKey): UnitPage[] | null {
  const pages: UnitPage[] = [];
  for (let chunk = 1; chunk <= CHUNKS; chunk++) {
    const u = loadUnit(ctx, id, level, chunk);
    if (!u) return null;
    pages.push(...u);
  }
  return pages;
}

/** Put one book together, check every rule in the brief, write the nine version files, and say whether it is done. */
export function finalizeBook(ctx: Ctx, book: CatalogueBook): BookReport {
  const status = readStatus(ctx, book.id);
  const base: BookReport = { id: book.id, niche: nicheSlug(book.niche), result: "incomplete", flags: status.flags ?? [], hard: [], soft: [], versions: {} };
  if (status.halted) return { ...base, result: "halted", halted: status.halted };
  const sheet = loadBeats(ctx, book.id);
  if (!sheet) return base;
  const health = isHealth(book);
  const dict = loadDictionary(ctx);
  const dir = join(ctx.paths.content, nicheSlug(book.niche), book.id);
  const allPages: Page[] = [];
  const issues: Issue[] = [];
  const built: Partial<Record<string, Page[]>> = {};

  for (const level of LEVELS) {
    const units = levelUnits(ctx, book.id, level);
    if (!units) return base;
    const lv = buildLevel(units, level, health);
    for (const length of LENGTHS) {
      const pages = lv[length];
      built[`${level}_${length}`] = pages;
      allPages.push(...pages);
      issues.push(...versionIssues(pages, level, length, { disclaimer: health, names: namesOf(sheet.bible) }));
    }
    issues.push(...containmentIssues(lv[100], lv[200]).map((i) => ({ ...i, where: `${level}: ${i.where}` })));
  }
  issues.push(...dictionaryIssues(allPages, dict));
  if (loadOriginality(ctx, book.id).length === 0 && book.type === "original") issues.push({ code: "originality-unchecked", message: "the originality check has not run" });

  const hard = issues.filter((i) => !SOFT.has(i.code));
  const soft = issues.filter((i) => SOFT.has(i.code));
  const result: BookResult = hard.length ? "fail" : soft.length || base.flags.length ? "flags" : "pass";

  mkdirSync(dir, { recursive: true });
  writeJson(join(dir, "meta.json"), { ...buildMeta(book, sheet), status: result });
  writeJson(join(dir, "beats.json"), { beats: sheet.beats, bible: sheet.bible });
  for (const v of ALL_VERSIONS) {
    const [level, length] = v.split("_") as [LevelKey, string];
    writeJson(join(dir, versionFile(level, Number(length) as 50 | 100 | 200)), { book: book.id, level, length: Number(length), pages: built[v] }, false);
  }
  const versions: BookReport["versions"] = {};
  for (const v of ALL_VERSIONS) versions[v] = { pages: built[v]!.length, ok: !issues.some((i) => i.where?.startsWith(v)) };
  return { ...base, result, hard, soft, versions };
}

/** 50 pages per level, drawn across every finished book in a fixed pseudo-random order, for a native speaker to read. */
export function writeReviewSamples(ctx: Ctx, books: CatalogueBook[]): void {
  mkdirSync(ctx.paths.review, { recursive: true });
  for (const level of LEVELS) {
    const pool: { rank: string; book: string; version: string; page: Page }[] = [];
    for (const book of books) {
      const units = levelUnits(ctx, book.id, level);
      if (!units || !loadBeats(ctx, book.id)) continue;
      for (const page of buildLevel(units, level, isHealth(book))[200]) pool.push({ rank: reviewRank(book.id, level, page.n), book: book.id, version: `${level}_200`, page });
    }
    pool.sort((a, b) => a.rank.localeCompare(b.rank));
    writeJson(join(ctx.paths.review, `${level}.json`), pool.slice(0, 50).map(({ book, version, page }) => ({ book, version, ...page })));
  }
}

export function finalizeAll(ctx: Ctx, books: CatalogueBook[]): { reports: BookReport[]; unresolved: number } {
  const reports = books.map((b) => finalizeBook(ctx, b));
  const unresolved = flaggedPages(ctx, books).length;
  writeReviewSamples(ctx, books);
  const summary = {
    generated: new Date().toISOString(),
    totals: { books: reports.length, pass: reports.filter((r) => r.result === "pass").length, flags: reports.filter((r) => r.result === "flags").length, fail: reports.filter((r) => r.result === "fail").length, halted: reports.filter((r) => r.result === "halted").length, incomplete: reports.filter((r) => r.result === "incomplete").length, flaggedPages: unresolved },
    books: Object.fromEntries(reports.map((r) => [r.id, r])),
  };
  writeJson(join(ctx.paths.reports, "validation.json"), summary);
  return { reports, unresolved };
}

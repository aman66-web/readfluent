/**
 * Checks a hand-written book (lib/preview/books/<slug>/en.json) against the same rules the
 * pipeline holds its books to (scripts/pipeline/validate.ts, cefr.ts): one beat per page, the same number
 * of pages in each of the three levels (200 for a book with named chapters; 50 for the first-generation books), the right number of sentences per page, readable at the level, no markup.
 *
 *   npx tsx scripts/books/check-en.ts <slug> [--path <file.json>]
 *
 * With `--path` it checks that file instead of the book's own en.json: a writer builds the new version
 * of a book in a work folder and only copies it into the library once it is clean.
 *
 * Exit code 1 if any hard rule is broken. CEFR flags (sentence length, word difficulty) are listed
 * as FLAG and also fail the run: a book is finished when it prints "clean".
 */
import { readFileSync } from "node:fs";
import { cefrIssues, namesOf } from "../pipeline/cefr";
import { LEVEL_SPECS } from "../pipeline/config";
import { sentences, wordCount } from "../pipeline/text";
import type { LevelKey } from "../pipeline/types";

/** The library's length: every book is being brought to this many pages, in twenty chapters of ten, each named. */
export const PAGES = 200;
export const CHAPTER_PAGES = 10;
/** The first generation of books had 50 pages and no chapter names; they stay valid until they are rewritten. */
export const FIRST_GENERATION_PAGES = 50;
const LEVEL_KEYS: Record<string, LevelKey> = { A1A2: "A", B1B2: "B", C1C2: "C" };
const LEFTOVER = [/\*\*/, /^#{1,6}\s/m, /`/, /\[[A-Za-z ]+\]/, /\bTODO\b/, /\bas an AI\b/i, /^\s*(Note|Page|Beat|Slot)\s*[:\d]/im, /<\/?[a-z][^>]*>/i, /\{\{|\}\}/];

export interface EnBook {
  slug: string;
  meta: { blurb: string; bible: string; /** One name per chapter of ten pages. Present on a full-length (200-page) book. */ chapters?: string[] };
  beats: { n: number; scene: string; summary: string }[];
  levels: Record<string, string[]>;
}

export interface Problem { hard: boolean; where: string; message: string }

export function checkBook(book: EnBook): Problem[] {
  const out: Problem[] = [];
  const hard = (where: string, message: string) => out.push({ hard: true, where, message });
  const flag = (where: string, message: string) => out.push({ hard: false, where, message });
  const names = namesOf(book.meta?.bible ?? "");
  // A book with chapter names is a full-length book; one without is a first-generation one.
  const full = Array.isArray(book.meta?.chapters);
  const PAGES_HERE = full ? PAGES : FIRST_GENERATION_PAGES;
  if (!book.meta?.blurb?.trim()) hard("meta", "no blurb");
  else if (wordCount(book.meta.blurb) > 45) hard("meta", `the blurb has ${wordCount(book.meta.blurb)} words; 45 at most`);
  if (full) {
    const ch = book.meta.chapters!;
    if (ch.length !== PAGES / CHAPTER_PAGES) hard("chapters", `needs ${PAGES / CHAPTER_PAGES} chapter names, has ${ch.length}`);
    const seenCh = new Set<string>();
    ch.forEach((name, i) => {
      const where = `chapter ${i + 1}`;
      if (typeof name !== "string" || !name.trim()) return hard(where, "has no name");
      if (wordCount(name) > 7) hard(where, "name is longer than 7 words");
      if (/[.!?…]$/.test(name.trim())) hard(where, "name ends with punctuation");
      if (/^(chapter|part)\b/i.test(name.trim()) || /^\d+[.:)]?\s/.test(name.trim())) hard(where, "name must be a title, without \"Chapter\" or a number");
      if (seenCh.has(name.trim().toLowerCase())) hard(where, "repeats another chapter's name");
      seenCh.add(name.trim().toLowerCase());
    });
  }
  if (!book.meta?.bible?.trim()) hard("meta", "no bible (names and facts)");
  if (!Array.isArray(book.beats) || book.beats.length !== PAGES_HERE) hard("beats", `needs ${PAGES_HERE} beats, has ${book.beats?.length ?? 0}`);
  book.beats?.forEach((b, i) => {
    if (b.n !== i + 1) hard(`beat ${i + 1}`, `numbered ${b.n}`);
    if (!b.scene?.trim() || wordCount(b.scene) > 14) hard(`beat ${i + 1}`, "scene must be a short caption of 14 words or fewer");
    if (!b.summary?.trim()) hard(`beat ${i + 1}`, "no summary");
  });
  for (const [id, key] of Object.entries(LEVEL_KEYS)) {
    const pages = book.levels?.[id];
    if (!Array.isArray(pages) || pages.length !== PAGES_HERE) { hard(id, `needs ${PAGES_HERE} pages, has ${pages?.length ?? 0}`); continue; }
    const spec = LEVEL_SPECS[key];
    const seen = new Set<string>();
    pages.forEach((text, i) => {
      const where = `${id} p${i + 1}`;
      if (typeof text !== "string" || !text.trim()) return hard(where, "empty");
      if (seen.has(text)) hard(where, "repeats an earlier page");
      seen.add(text);
      for (const re of LEFTOVER) if (re.test(text)) hard(where, `contains markup or an instruction (${re})`);
      if (/\.\.\.|…/.test(text)) hard(where, "ellipsis makes the sentence count ambiguous");
      if (/\b(Mr|Mrs|Ms|Dr|St)\./.test(text)) hard(where, "titles are written without a full stop (Mr Darcy)");
      const n = sentences(text).length;
      if (n !== spec.sentences) hard(where, `has ${n} sentences; ${spec.label} pages have ${spec.sentences}`);
      for (const issue of cefrIssues(text, key, names)) flag(where, issue.message);
    });
  }
  return out;
}

if (process.argv[1]?.endsWith("check-en.ts")) {
  const slug = process.argv[2];
  if (!slug) { console.error("usage: npx tsx scripts/books/check-en.ts <slug> [--path <file.json>]"); process.exit(2); }
  const at = process.argv.indexOf("--path");
  const file = at > 0 && process.argv[at + 1] ? process.argv[at + 1] : null;
  const book = JSON.parse(readFileSync(file ?? new URL(`../../lib/preview/books/${slug}/en.json`, import.meta.url), "utf8")) as EnBook;
  const problems = checkBook(book);
  for (const p of problems) console.log(`${p.hard ? "FAIL" : "FLAG"}  ${p.where}: ${p.message}`);
  const hardN = problems.filter((p) => p.hard).length;
  console.log(problems.length === 0 ? `${slug}: clean` : `${slug}: ${hardN} failures, ${problems.length - hardN} flags`);
  process.exit(problems.length ? 1 : 0);
}

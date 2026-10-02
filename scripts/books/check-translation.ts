/**
 * Checks a translation of a hand-written book (lib/preview/books/<slug>/<lang>.json) against its
 * English (en.json): same pages, same number of sentences in each, three key word pairs per page
 * that really are words of the two pages and sit in the same sentence, nothing left over from
 * the writing. Reuses the pipeline's page rules (scripts/pipeline/validate.ts).
 *
 *   npx tsx scripts/books/check-translation.ts <slug> <lang>
 */
import { readFileSync } from "node:fs";
import { namesOf } from "../pipeline/cefr";
import { pageIssues } from "../pipeline/validate";
import type { LevelKey } from "../pipeline/types";
import type { EnBook } from "./check-en";

const LEVEL_KEYS: Record<string, LevelKey> = { A1A2: "A", B1B2: "B", C1C2: "C" };

export interface TrBook { slug: string; lang: string; title?: string; blurb?: string; levels: Record<string, { text: string; keys: { w: string; en: string }[] }[]> }

export function checkTranslation(en: EnBook, tr: TrBook): string[] {
  const out: string[] = [];
  const names = namesOf(en.meta.bible);
  if (tr.slug !== en.slug) out.push(`slug is ${tr.slug}, expected ${en.slug}`);
  if (!tr.title?.trim()) out.push("no title");
  if (!tr.blurb?.trim()) out.push("no blurb");
  for (const [id, key] of Object.entries(LEVEL_KEYS)) {
    const pages = tr.levels?.[id];
    const source = en.levels[id];
    if (!Array.isArray(pages) || pages.length !== source.length) { out.push(`${id}: needs ${source.length} pages, has ${pages?.length ?? 0}`); continue; }
    const seen = new Set<string>();
    pages.forEach((p, i) => {
      const where = `${id} p${i + 1}`;
      if (typeof p?.text !== "string" || !p.text.trim()) { out.push(`${where}: empty`); return; }
      if (seen.has(p.text)) out.push(`${where}: repeats an earlier page`);
      seen.add(p.text);
      // The English page is already known to be right; only what concerns the translation is reported.
      for (const issue of pageIssues({ en: source[i], es: p.text, keys: (p.keys ?? []).map((k) => ({ es: k.w, en: k.en })) }, key, where, names)) {
        if (/^(too-|en-sentences)/.test(issue.code)) continue;
        out.push(`${where}: ${issue.message}`);
      }
    });
  }
  return out;
}

if (process.argv[1]?.endsWith("check-translation.ts")) {
  const [slug, lang] = process.argv.slice(2);
  if (!slug || !lang) { console.error("usage: npx tsx scripts/books/check-translation.ts <slug> <lang>"); process.exit(2); }
  const dir = new URL(`../../lib/preview/books/${slug}/`, import.meta.url);
  const en = JSON.parse(readFileSync(new URL("en.json", dir), "utf8")) as EnBook;
  const tr = JSON.parse(readFileSync(new URL(`${lang}.json`, dir), "utf8")) as TrBook;
  const problems = checkTranslation(en, tr);
  for (const p of problems) console.log(`FAIL  ${p}`);
  console.log(problems.length === 0 ? `${slug} ${lang}: clean` : `${slug} ${lang}: ${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
}

/**
 * Builds the sentence banks the app's tests are made from:
 *
 *   npx tsx scripts/books/build-test-corpus.ts
 *
 * `lib/tests/corpus.en.json`: sentences of the English books, by band (A1–A2, B1–B2, C1–C2), a few pages from
 * every book, for tests of English (cloze, word order, listening).
 * `lib/tests/corpus.es.json`: the Spanish translations of the books that have them, each Spanish sentence with
 * its English sentence and the words matched in it, for every kind of test of Spanish.
 *
 * The banks are data, read on the server only when a test is asked for (app/api/tests); they are rebuilt when books
 * are rewritten or translated. Each item is one sentence: `b` the band (0 A1–A2, 1 B1–B2, 2 C1–C2), `t` the sentence,
 * `e` its English where it has one, `k` the matched words as [word, English] pairs.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { sentenceRanges } from "../../lib/reading/sentences";

const ROOT = new URL("../../", import.meta.url);
const BOOKS = new URL("lib/preview/books/", ROOT);
const BANDS = ["A1A2", "B1B2", "C1C2"] as const;
interface Item { b: number; t: string; e?: string; k?: [string, string][] }
const split = (text: string): string[] => sentenceRanges(text).map(([a, b]) => text.slice(a, b).trim()).filter(Boolean);
const rd = <T,>(f: URL): T => JSON.parse(readFileSync(f, "utf8")) as T;

const en: Item[] = [];
const es: Item[] = [];
for (const slug of readdirSync(BOOKS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const f = new URL(`${slug}/en.json`, BOOKS);
  if (!existsSync(f)) continue;
  const book = rd<{ levels: Record<string, string[]> }>(f);
  BANDS.forEach((band, b) => {
    const pages = book.levels[band] ?? [];
    // Four pages spread across the book, so a test does not only meet its opening.
    const step = Math.max(1, Math.floor(pages.length / 4));
    for (let i = Math.floor(step / 2); i < pages.length && i < step * 4; i += step) for (const t of split(pages[i])) en.push({ b, t });
  });
  const g = new URL(`${slug}/es.json`, BOOKS);
  if (!existsSync(g)) continue;
  const tr = rd<{ levels: Record<string, { text: string; keys: { w: string; en: string }[] }[]> }>(g);
  BANDS.forEach((band, b) => {
    (tr.levels[band] ?? []).forEach((page, i) => {
      const mine = split(page.text);
      const theirs = split(book.levels[band]?.[i] ?? "");
      mine.forEach((t, j) => {
        const e = theirs.length === mine.length ? theirs[j] : undefined;
        const k = page.keys.filter((x) => t.toLowerCase().includes(x.w.toLowerCase())).map((x) => [x.w, x.en] as [string, string]);
        es.push({ b, t, ...(e ? { e } : {}), ...(k.length ? { k } : {}) });
      });
    });
  });
}
writeFileSync(new URL("lib/tests/corpus.en.json", ROOT), JSON.stringify(en));
writeFileSync(new URL("lib/tests/corpus.es.json", ROOT), JSON.stringify(es));
console.log(`corpus.en.json: ${en.length} sentences; corpus.es.json: ${es.length} sentences`);

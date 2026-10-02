/**
 * Builds the library's catalogue from the books that have been written:
 *
 *   npx tsx scripts/books/build-catalog.ts
 *
 * For every entry of scripts/books/LIST.json that is not one of the hand-built five and has both
 * `lib/preview/books/<slug>/en.json` and `cover.json`, it writes one record (title, who it is by, kind,
 * category, jacket blurb and the cover's drawing) to `lib/preview/written.generated.json`, which the
 * app's catalogue and covers read. Only metadata goes in: the pages stay in each book's own file and are
 * read on the server when somebody opens the book.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { GeneratedBook } from "../../lib/preview/generated";
import { checkBook, type EnBook } from "./check-en";

interface ListEntry { slug: string; title: string; category: string; type: "classic" | "original"; author?: string; inspiredBy?: string; done: boolean }
interface CoverFile { bg: string; light?: boolean; art: string[] }
const ROOT = new URL("../../", import.meta.url);
const read = <T,>(p: string): T => JSON.parse(readFileSync(new URL(p, ROOT), "utf8")) as T;

/** The title broken into lines of about 13 letters or fewer, never splitting a word. */
export function breakTitle(title: string, max = 13): string[] {
  const lines: string[] = [];
  for (const word of title.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + word).length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  // Small words ("of", "the") hang at the end of a line rather than start the next, which reads better on a cover.
  return lines;
}

/** Type size (in the cover's 112-unit width): big for a short title, smaller as its longest line grows. */
export function titleSize(lines: string[]): number {
  const longest = Math.max(...lines.map((l) => l.length));
  const fit = 168 / longest;
  const shrink = lines.length > 3 ? 0.9 : 1;
  return Math.round(Math.max(10.5, Math.min(19, fit * shrink)) * 2) / 2;
}

const SCRIPTURE = /scripture|bible|gospel|tradition/i;
/** What a cover prints under the title: the author of a classic, nothing for a book "inspired by" another. */
export function coverAuthor(e: ListEntry): string {
  if (e.type !== "classic" || !e.author || SCRIPTURE.test(e.author)) return "";
  return e.author.toUpperCase();
}

export function buildAll(): GeneratedBook[] {
  const list = read<ListEntry[]>("scripts/books/LIST.json");
  const out: GeneratedBook[] = [];
  for (const e of list) {
    if (e.done) continue;
    const dir = `lib/preview/books/${e.slug}`;
    if (!existsSync(new URL(`${dir}/en.json`, ROOT)) || !existsSync(new URL(`${dir}/cover.json`, ROOT))) continue;
    const en = read<EnBook>(`${dir}/en.json`);
    // A book a writer is still working on is left out until the checker is satisfied.
    if (checkBook(en).length > 0) continue;
    const cv = read<CoverFile>(`${dir}/cover.json`);
    const lines = breakTitle(e.title);
    const art = (cv.art ?? []).slice(0, 2);
    const glow = cv.light ? [] : [{ id: cv.bg === "#0E7490" || cv.bg === "#164E63" ? "glowPale" : "glowCyan", x: 100, y: 80, s: 0.9 }];
    out.push({
      slug: e.slug,
      title: e.title,
      author: e.type === "classic" ? (e.author ?? "") : (e.inspiredBy ?? ""),
      kind: e.type === "classic" ? "classic" : "inspired",
      category: e.category,
      blurb: en.meta.blurb.trim(),
      cover: {
        bg: cv.bg, ...(cv.light ? { light: true } : {}), title: lines, size: titleSize(lines), author: coverAuthor(e),
        pieces: [...glow, ...art.map((id, i) => ({ id, x: 100 + (i ? 34 : 0), y: i ? 104 : 80, s: i ? 0.5 : 0.95 }))],
      },
    });
  }
  return out;
}

if (process.argv[1]?.endsWith("build-catalog.ts")) {
  const books = buildAll();
  writeFileSync(new URL("lib/preview/written.generated.json", ROOT), JSON.stringify(books, null, 1) + "\n");
  console.log(`wrote lib/preview/written.generated.json: ${books.length} books`);
}

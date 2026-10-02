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

/** How wide each letter of the cover's display serif (bold) runs, in ems. Close enough to size a title so it fits. */
const EM: Record<string, number> = {
  a: .55, b: .6, c: .5, d: .6, e: .53, f: .38, g: .56, h: .62, i: .32, j: .32, k: .6, l: .32, m: .92, n: .63, o: .58, p: .6, q: .6, r: .45, s: .46, t: .38, u: .62, v: .54, w: .82, x: .55, y: .54, z: .5,
  A: .78, B: .72, C: .72, D: .8, E: .68, F: .64, G: .8, H: .84, I: .4, J: .5, K: .78, L: .65, M: .98, N: .84, O: .82, P: .66, Q: .82, R: .74, S: .62, T: .68, U: .8, V: .76, W: 1.06, X: .76, Y: .72, Z: .66,
  " ": .26, "'": .25, "’": .25, ",": .28, "-": .38, ":": .3,
};
/** A line's width in ems of type, with a little to spare. */
export const emWidth = (line: string): number => [...line].reduce((w, ch) => w + (EM[ch] ?? 0.6), 0) * 1.04;

/** Room for a title on the cover, in the cover's 112-unit width: 112 less the spine and the margins, and a little to spare. */
const ROOM = 78;
const BIGGEST = 19;
const SMALLEST = 10.5;

/** The title broken into lines that fit the cover at a good size, never splitting a word. */
export function breakTitle(title: string, max = 13): string[] {
  const lines: string[] = [];
  // A hyphenated word ("Gentleman-Burglar") may break after its hyphen; the pieces are glued back if they fit on one line.
  const pieces = title.split(/\s+/).flatMap((w) => (w.includes("-") && w.length > 9 ? w.split(/(?<=-)/).map((p, i, all) => ({ p, glue: i > 0 && all.length > 1 })) : [{ p: w, glue: false }]));
  for (const { p, glue } of pieces) {
    const last = lines[lines.length - 1];
    const joined = last === undefined ? "" : glue ? `${last}${p}` : `${last} ${p}`;
    // A line grows while it is short in letters and no wider than the room allows at a size that still reads.
    if (last !== undefined && joined.length <= max && emWidth(joined) * 11.5 <= ROOM) lines[lines.length - 1] = joined;
    else lines.push(p);
  }
  return lines;
}

/** Type size (in the cover's 112-unit width): as big as the widest line allows, up to a limit. */
export function titleSize(lines: string[]): number {
  const widest = Math.max(...lines.map(emWidth));
  const shrink = lines.length > 3 ? 0.9 : 1;
  return Math.floor(Math.max(SMALLEST, Math.min(BIGGEST, (ROOM / widest) * shrink)) * 2) / 2;
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
        pieces: [...glow, ...art.map((id, i) => ({ id, x: i ? 160 : 100, y: i ? 38 : 82, s: i ? 0.36 : 0.92 }))],
      },
    });
  }
  return out;
}

/** How many pages each written book has (the same in all three levels), for every book that has pages: the app reads it to know a book's length without loading its text. */
export function pageCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of read<ListEntry[]>("scripts/books/LIST.json")) {
    const f = new URL(`lib/preview/books/${e.slug}/en.json`, ROOT);
    if (!existsSync(f)) continue;
    const en = JSON.parse(readFileSync(f, "utf8")) as EnBook;
    // A book a writer is still working on keeps its last good length until it passes the checker.
    if (checkBook(en).length === 0) out[e.slug] = en.levels.A1A2.length;
  }
  return out;
}

if (process.argv[1]?.endsWith("build-catalog.ts")) {
  writeFileSync(new URL("lib/preview/pages.generated.json", ROOT), JSON.stringify(pageCounts(), null, 1) + "\n");
  const books = buildAll();
  writeFileSync(new URL("lib/preview/written.generated.json", ROOT), JSON.stringify(books, null, 1) + "\n");
  console.log(`wrote lib/preview/written.generated.json: ${books.length} books`);
}

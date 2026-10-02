/**
 * Lists which written books are finished: both files exist and the checker finds nothing.
 *
 *   npx tsx scripts/books/list-clean.ts          → prints "clean <slug>" / "open <slug>" for each folder
 *
 * A writer's half-finished book is "open" and must not be committed or built.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { checkBook, type EnBook } from "./check-en";

const ROOT = new URL("../../lib/preview/books/", import.meta.url);
const list = JSON.parse(readFileSync(new URL("../books/LIST.json", import.meta.url), "utf8")) as { slug: string; done: boolean }[];
const hand = new Set(list.filter((e) => e.done).map((e) => e.slug));
for (const slug of readdirSync(ROOT).sort()) {
  if (hand.has(slug) || !existsSync(new URL(`${slug}/en.json`, ROOT))) continue;
  let ok = false;
  try {
    const book = JSON.parse(readFileSync(new URL(`${slug}/en.json`, ROOT), "utf8")) as EnBook;
    ok = existsSync(new URL(`${slug}/cover.json`, ROOT)) && checkBook(book).length === 0;
  } catch { ok = false; }
  console.log(`${ok ? "clean" : "open"} ${slug}`);
}

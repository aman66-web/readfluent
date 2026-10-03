/**
 * TEMPORARY. A preview slice so the app can be looked at before the content
 * pipeline exists (DECISIONS.md, "Preview slice"): one book, twelve scenes, three
 * levels. It is compiled into the app, which CLAUDE.md forbids for real content —
 * M1 replaces it with JSON served from storage, and this folder is then deleted.
 *
 * The text is an original retelling written for this preview, not a quotation.
 * Page counts are NOT the real 50/100/200: every length opens this same twelve-
 * page sample, and the reader says so.
 */
import GENERATED from "./written.generated.json";
import PAGE_COUNTS from "./pages.generated.json";
import type { GeneratedBook } from "./generated";
import { type CategoryId, type Length, type LevelId } from "@/lib/content/limits";

export interface Scene { n: number; caption: string }
export interface PreviewPage { n: number; text: string; scene: number }
export interface PreviewBook {
  /** One of the books listed by the catalogue builder (its pages are built on first request, not at build time). */
  generated?: boolean;
  /**
   * Where the pages are. Absent: in `text` below (the one sample book, compiled in). "file": in
   * `lib/preview/books/<slug>/en.json`, read on the server only when somebody opens the reader,
   * so no page of these books is ever sent to a phone that is not reading it.
   */
  source?: "file";
  /** Pages in each level of a "file" book (the real, full-length version). */
  pageCount?: number;
  /** The lengths this book exists in. Absent: all three (the sample opens for each). */
  lengths?: readonly Length[];
  slug: string;
  title: string;
  author: string;
  /** The day the book joined the library (YYYY-MM-DD). */
  added: string;
  kind: "classic" | "inspired";
  category: CategoryId;
  blurb: string;
  scenes: Scene[];
  /** The preview text, by level: one string per scene. */
  text: Record<LevelId, string[]>;
}

export const PREVIEW_BOOKS: PreviewBook[] = [];

/** A "file" book carries no text in the catalogue: the pages, the scene captions and the translations are loaded on the server (lib/preview/books/load.ts). */
const EMPTY_TEXT: Record<LevelId, string[]> = { A1A2: [], B1B2: [], C1C2: [] };

const WRITTEN: PreviewBook[] = [
  {
    source: "file", pageCount: 50, lengths: [50],
    slug: "pride-and-prejudice",
    added: "2026-10-01",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    kind: "classic",
    category: "romance",
    blurb: "Elizabeth Bennet hears a rich stranger call her barely tolerable, and she decides to dislike him for life. Mr Darcy, however, cannot stop looking at her. Two proud people, five sisters and one very wrong first impression.",
    scenes: [],
    text: EMPTY_TEXT,
  },
  {
    source: "file", pageCount: 50, lengths: [50],
    slug: "alice-s-adventures-in-wonderland",
    added: "2026-10-02",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    kind: "classic",
    category: "fantasy-scifi",
    blurb: "A white rabbit in a waistcoat hurries past, checking his watch, and bored Alice follows him down a hole. Below, cakes change her size, a cat grins and fades away, and a furious Queen wants heads to roll.",
    scenes: [],
    text: EMPTY_TEXT,
  },
  {
    source: "file", pageCount: 50, lengths: [50],
    slug: "the-hound-of-the-baskervilles",
    added: "2026-10-02",
    title: "The Hound of the Baskervilles",
    author: "Arthur Conan Doyle",
    kind: "classic",
    category: "crime",
    blurb: "Sir Charles Baskerville is found dead on a lonely path, and beside him are the prints of a giant dog. Now his heir comes home to the house on the moor. Watson goes with him, and something howls in the dark.",
    scenes: [],
    text: EMPTY_TEXT,
  },
  {
    source: "file", pageCount: 50, lengths: [50],
    slug: "the-richest-man-in-babylon",
    added: "2026-10-02",
    title: "The Richest Man in Babylon",
    author: "George S. Clason",
    kind: "classic",
    category: "business-money",
    blurb: "Bansir builds chariots, Kobbi plays the lute, and at sunset both of them are broke. So they walk across Babylon to Arkad, who started with nothing and is now the richest man in the city. His answer is simpler than they expect.",
    scenes: [],
    text: EMPTY_TEXT,
  },
  {
    source: "file", pageCount: 50, lengths: [50],
    slug: "trees-talk-to-each-other",
    added: "2026-10-02",
    title: "Trees Talk to Each Other",
    author: "The Hidden Life of Trees",
    kind: "inspired",
    category: "science",
    blurb: "Mina marks one acorn in the forest soil, then spends a year watching it with her grandfather Tomas. Through snow, spring and storm, they learn how trees and fungi trade, and why scientists still argue about how far it goes.",
    scenes: [],
    text: EMPTY_TEXT,
  },
];

PREVIEW_BOOKS.push(...WRITTEN);

/**
 * The rest of the library, written to the same rules (scripts/books/BRIEF-batch.md) and listed by
 * `scripts/books/build-catalog.ts`: only the jacket's words are here, never a page.
 */
const MORE: PreviewBook[] = (GENERATED as GeneratedBook[]).map((g) => ({
  source: "file" as const, pageCount: 50, lengths: [50] as const, generated: true,
  slug: g.slug, added: "2026-10-02", title: g.title, author: g.author, kind: g.kind, category: g.category as CategoryId,
  blurb: g.blurb, scenes: [], text: EMPTY_TEXT,
}));
PREVIEW_BOOKS.push(...MORE);

/**
 * Every written book has one length, the pages it has (200 once a book is full-length, 50 until then; no
 * choice is offered). Read from `pages.generated.json`, which the catalogue builder writes from the books.
 */
for (const b of PREVIEW_BOOKS) {
  const n = (PAGE_COUNTS as Record<string, number>)[b.slug];
  if (b.source === "file" && (n === 50 || n === 100 || n === 200)) { b.pageCount = n; b.lengths = [n]; }
}

export const findBook = (slug: string): PreviewBook | null => PREVIEW_BOOKS.find((b) => b.slug === slug) ?? null;

/** What a cover prints under the title: the author of a classic. A retelling "inspired by" a book names that book on the jacket page, not on a cover that would then read as its author. */
export const coverAuthor = (book: PreviewBook): string | undefined => (book.kind === "classic" ? book.author : undefined);

/** How many pages one level of the book has, wherever its text lives. */
export const pageCount = (book: PreviewBook, level: LevelId): number => book.pageCount ?? book.text[level].length;

/** The lengths a book can be read in. */
export const lengthsOf = (book: PreviewBook): readonly Length[] => book.lengths ?? [50, 100, 200];

/** The pages of one level of a book, each tied to its scene. Only for a book whose text is compiled in. */
export function pagesOf(book: PreviewBook, level: LevelId): PreviewPage[] {
  return book.text[level].map((text, i) => ({ n: i + 1, text, scene: i + 1 }));
}

/**
 * A blurb cut short for under a cover: whole words, about two lines, ending in "…". A blurb that already
 * fits is left alone. The full blurb is on the book's own page.
 */
export function shortBlurb(blurb: string, max = 64): string {
  const text = blurb.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  const words = (at > max * 0.5 ? cut.slice(0, at) : text.slice(0, max)).replace(/[\s,;:.!?\-–—]+$/, "");
  return `${words}…`;
}

/** The day the library opened. Only a book added after it is marked new. */
export const LIBRARY_LAUNCH = "2026-10-02";

/**
 * Text made comparable for a search: accents and case gone, curly quotes straight, punctuation a space
 * ("Dr. Jekyll" matches "dr jekyll", "Brontë" matches "bronte", "alice’s" matches "alice's").
 */
export function normSearch(s: string): string {
  return s.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[’‘`´]/g, "'").replace(/[.,:;!?"'()\-–—]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
}

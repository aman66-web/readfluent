import { describe, expect, it } from "vitest";
import { CATEGORIES, LENGTHS, LEVELS, PAGE_WORDS, levelBySlug, wordCount } from "@/lib/content/limits";
import { PREVIEW_BOOKS, findBook, pagesOf } from "@/lib/preview/catalog";

/**
 * The temporary preview content must obey the same page rule the real content
 * will (CLAUDE.md): this is the check the validator in M1 generalises.
 */
describe("the page rule", () => {
  it("counts words as runs of non-space characters", () => {
    expect(wordCount("one two  three\nfour")).toBe(4);
    expect(wordCount("   ")).toBe(0);
    expect(wordCount("")).toBe(0);
  });

  it("is 28 to 35 words, in one place", () => {
    expect(PAGE_WORDS).toEqual({ min: 28, max: 35 });
  });
});

describe("the fixed vocabulary", () => {
  it("has three levels, three lengths and nine categories", () => {
    expect(LEVELS.map((l) => l.label)).toEqual(["A1–A2", "B1–B2", "C1–C2"]);
    expect(LENGTHS.map((l) => l.pages)).toEqual([50, 100, 200]);
    expect(CATEGORIES).toHaveLength(9);
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(9);
  });

  it("maps URL slugs back to levels", () => {
    expect(levelBySlug("b1b2")?.id).toBe("B1B2");
    expect(levelBySlug("B1B2")).toBeNull();
    expect(levelBySlug("nope")).toBeNull();
  });
});

describe("the preview book", () => {
  const book = findBook("pride-and-prejudice")!;

  it("exists and is a classic in a real category", () => {
    expect(book.kind).toBe("classic");
    expect(CATEGORIES.map((c) => c.id)).toContain(book.category);
    expect(PREVIEW_BOOKS.map((b) => b.slug)).toEqual([...new Set(PREVIEW_BOOKS.map((b) => b.slug))]);
  });

  it("has every page of every level inside the word limits", () => {
    for (const level of LEVELS) {
      for (const p of pagesOf(book, level.id)) {
        const n = wordCount(p.text);
        expect(n, `${level.id} page ${p.n} has ${n} words`).toBeGreaterThanOrEqual(PAGE_WORDS.min);
        expect(n, `${level.id} page ${p.n} has ${n} words`).toBeLessThanOrEqual(PAGE_WORDS.max);
      }
    }
  });

  it("tells the same story at every level: the same number of pages, each tied to the same scene", () => {
    const counts = LEVELS.map((l) => pagesOf(book, l.id).length);
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBe(book.scenes.length);
    for (const l of LEVELS) expect(pagesOf(book, l.id).map((p) => p.scene)).toEqual(book.scenes.map((s) => s.n));
  });

  it("gets harder with the level: longer words on average", () => {
    const avgWordLength = (id: (typeof LEVELS)[number]["id"]) => {
      const words = pagesOf(book, id).flatMap((p) => p.text.split(/\s+/)).map((w) => w.replace(/[^A-Za-z]/g, ""));
      return words.reduce((a, w) => a + w.length, 0) / words.length;
    };
    expect(avgWordLength("A1A2")).toBeLessThan(avgWordLength("B1B2"));
    expect(avgWordLength("B1B2")).toBeLessThan(avgWordLength("C1C2"));
  });
});

import { describe, expect, it } from "vitest";
import { CATEGORIES, LENGTHS, LEVELS, PAGE_WORDS, levelBySlug, wordCount } from "@/lib/content/limits";
import { PREVIEW_BOOKS, findBook } from "@/lib/preview/catalog";

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

/** Every book's pages are checked in books.test.ts and by scripts/books/check-en.ts; here, only the catalogue. */
describe("the catalogue", () => {
  const book = findBook("pride-and-prejudice")!;

  it("has Pride and Prejudice as a classic in a real category, and no slug twice", () => {
    expect(book.kind).toBe("classic");
    expect(CATEGORIES.map((c) => c.id)).toContain(book.category);
    expect(PREVIEW_BOOKS.map((b) => b.slug)).toEqual([...new Set(PREVIEW_BOOKS.map((b) => b.slug))]);
  });
});

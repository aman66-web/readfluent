import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_MAX, buildSession } from "@/lib/srs/session";
import { newCard, type Card } from "@/lib/srs/schedule";
import { parseSaved, wordsOfBook, type Saved } from "@/lib/words/saved";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

const word = (w: string, book: string, slug?: string) => ({ word: w, lang: "es", meaning: "m", book, ...(slug ? { slug } : {}), at: 1 });
const saved: Saved = {
  "es:casa": word("casa", "Pride and Prejudice", "pride-and-prejudice"),
  "es:mesa": word("mesa", "Orgullo y prejuicio", "pride-and-prejudice"),
  "es:luz": word("luz", "Pride and Prejudice"), // saved before the slug was kept, under the book's title
  "es:sol": word("sol", "Emma", "emma"),
  "es:mar": word("mar", "Something else"),
};

describe("the words saved from one book (owner, 6 Oct 2026: practise a book's flashcards from its page)", () => {
  it("finds the words saved with the book's slug, whatever title they were saved under", () => {
    expect(wordsOfBook(saved, "pride-and-prejudice").sort()).toEqual(["es:casa", "es:mesa"]);
  });

  it("finds older words (no slug) by the book's title, in any of its names, ignoring case", () => {
    expect(wordsOfBook(saved, "pride-and-prejudice", ["pride and prejudice", "Orgullo y prejuicio"]).sort()).toEqual(["es:casa", "es:luz", "es:mesa"]);
  });

  it("never gives one book another book's words", () => {
    expect(wordsOfBook(saved, "emma", ["Emma"])).toEqual(["es:sol"]);
    expect(wordsOfBook(saved, "persuasion", ["Persuasion"])).toEqual([]);
  });

  it("keeps the slug when words are read back, and adds nothing to a word without one", () => {
    const back = parseSaved(JSON.stringify(saved));
    expect(back["es:casa"].slug).toBe("pride-and-prejudice");
    expect("slug" in back["es:luz"]).toBe(false);
  });
});

describe("a sitting of every card of a book", () => {
  const now = 1_000_000_000;
  const card = (id: string, dueIn: number): Card => ({ ...newCard(id, now), due: now + dueIn, interval: dueIn > 0 ? 3 : 0, reps: dueIn > 0 ? 2 : 0 });
  const cards = [card("a", 5 * 86_400_000), card("b", 0), card("c", 2 * 86_400_000), card("d", 0), card("x", 0)];

  it("holds every card of the set, the ones due first and then the rest soonest-due first, and none of another set", () => {
    const ids = buildSession(cards, now, { only: (id) => id !== "x", all: true });
    expect(ids).toEqual(["b", "d", "c", "a"]);
  });

  it("holds more than a usual sitting does, up to a hundred", () => {
    const many = Array.from({ length: 150 }, (_, i) => card(`k${i}`, i * 1000));
    expect(buildSession(many, now, { all: true })).toHaveLength(ALL_MAX);
    expect(buildSession(many, now, {}).length).toBeLessThan(ALL_MAX);
  });
});

describe("wiring", () => {
  it("saves the book's slug with a word", () => {
    expect(read("components/Reader.tsx")).toContain("book: title, slug });");
  });
  it("shows the section on the book page, and the practise link goes to this book's flashcards", () => {
    expect(read("components/book/ReadPicker.tsx")).toContain("<BookWords slug={slug} titles={titles} />");
    expect(read("components/book/BookWords.tsx")).toContain("/recall/flashcards?book=");
  });
  it("opens the flashcards for a book that exists, and goes back to its page", () => {
    expect(read("app/recall/flashcards/page.tsx")).toContain("findBook(q.book)");
    expect(read("components/recall/Flashcards.tsx")).toContain("`/book/${book.slug}`");
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BOOK_DECKS, bookCardId, bookDeckLevel, loadBookDeck, parseBookCardId } from "@/lib/decks/books";
import { newCard } from "@/lib/srs/schedule";
import { buildSession, inBookDeck } from "@/lib/srs/session";
import { EMPTY_SRS, sittingState, withCardsFor } from "@/lib/srs/store";

/** The book decks (lib/decks/books/<slug>/<lang>.<level>.json): every sentence of the book, cut at its commas, in the language being learned. */
const ROOT = path.join(process.cwd(), "lib/decks/books");
const norm = (s: string) => s.replace(/,/g, "").replace(/\s+/g, " ").trim();

describe("book decks", () => {
  it("every deck listed has its file, and every file is listed", () => {
    const files = fs.readdirSync(ROOT).flatMap((slug) => fs.readdirSync(path.join(ROOT, slug)).map((f) => `${slug}/${f}`)).sort();
    const listed = Object.entries(BOOK_DECKS).flatMap(([slug, langs]) => Object.entries(langs).flatMap(([lang, levels]) => levels.map((l) => `${slug}/${lang}.${l}.json`))).sort();
    expect(files).toEqual(listed);
  });

  it("Pride and Prejudice A1 in Hindi: the cards, read in order, are the book's sentences, none blank, none repeated", async () => {
    const deck = JSON.parse(fs.readFileSync(path.join(ROOT, "pride-and-prejudice/hi.a1.json"), "utf8")) as { slug: string; lang: string; cards: { t: string; en: string; ph: string; page: number }[] };
    const book = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/preview/books/pride-and-prejudice/en.json"), "utf8")) as { levels: { A1A2: string[] } };
    expect(deck.slug).toBe("pride-and-prejudice");
    expect(deck.lang).toBe("hi");
    const pages = book.levels.A1A2;
    for (let n = 1; n <= pages.length; n++) {
      const mine = deck.cards.filter((c) => c.page === n);
      expect(mine.length, `page ${n} has cards`).toBeGreaterThan(0);
      expect(norm(mine.map((c) => c.en).join(" ")), `page ${n}`).toBe(norm(pages[n - 1]));
    }
    // In page order, so a session meets the story in order.
    expect(deck.cards.map((c) => c.page)).toEqual([...deck.cards.map((c) => c.page)].sort((a, b) => a - b));
    for (const c of deck.cards) {
      expect(c.t.trim(), "hindi").toBeTruthy();
      expect(c.ph.trim(), "romanised").toBeTruthy();
      expect(/[ऀ-ॿ]/.test(c.t), `${c.t} is Devanagari`).toBe(true);
      expect(/[A-Za-z]/.test(c.t), `${c.t} has no Latin letters`).toBe(false);
      expect(c.en.length, c.en).toBeLessThan(80);
    }
    expect(new Set(deck.cards.map((c) => `${c.page}|${c.t}`)).size).toBe(deck.cards.length);
    expect((await loadBookDeck("pride-and-prejudice", "hi", "a1")).length).toBe(deck.cards.length);
  });

  it("card ids round-trip and reject nonsense", () => {
    expect(parseBookCardId(bookCardId("pride-and-prejudice", "hi", "a1", 12))).toEqual({ slug: "pride-and-prejudice", lang: "hi", level: "a1", index: 12 });
    expect(parseBookCardId("bk:../x:hi:a1:1")).toBeNull();
    expect(parseBookCardId("deck:hi:3")).toBeNull();
  });

  it("load only a real deck", async () => {
    expect(await loadBookDeck("../x", "hi", "a1")).toEqual([]);
    expect(await loadBookDeck("pride-and-prejudice", "fr", "a1")).toEqual([]);
    expect(bookDeckLevel("pride-and-prejudice", "hi")).toBe("a1");
    expect(bookDeckLevel("pride-and-prejudice", "fr")).toBeNull();
    expect(bookDeckLevel("dracula", "hi")).toBeNull();
  });

  it("a sitting meets the story in order, ten new cards at a time, and keeps its progress when words are synced", () => {
    const now = 1_000_000;
    const state = sittingState(EMPTY_SRS, {}, null, now, null, { slug: "pride-and-prejudice", lang: "hi", level: "a1", size: 393 });
    expect(Object.keys(state.cards)).toHaveLength(393);
    const ids = buildSession(Object.values(state.cards), now, { only: (id) => inBookDeck(id, "pride-and-prejudice", "hi") });
    expect(ids).toEqual(Array.from({ length: 10 }, (_, i) => bookCardId("pride-and-prejudice", "hi", "a1", i)));
    // The next sitting must not drop them (saved-word sync keeps the deck's cards).
    expect(Object.keys(withCardsFor(state, {}, now).cards)).toHaveLength(393);
  });

  it("keeps the cards of the phrase, topic and book decks when saved words are synced (topic cards used to be dropped, and their progress with them)", () => {
    const now = 1_000_000;
    const srs = { cards: { "deck:hi:0": newCard("deck:hi:0", now), "topic:hi:food:0": newCard("topic:hi:food:0", now), "bk:pride-and-prejudice:hi:a1:0": newCard("bk:pride-and-prejudice:hi:a1:0", now), "hi:gone": newCard("hi:gone", now) }, log: {} };
    expect(Object.keys(withCardsFor(srs, {}, now).cards).sort()).toEqual(["bk:pride-and-prejudice:hi:a1:0", "deck:hi:0", "topic:hi:food:0"]);
  });
});

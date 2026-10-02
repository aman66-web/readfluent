import { describe, expect, it } from "vitest";
import { DAY_MS, MIN_EASE, RELEARN_MS, START_EASE, dueCards, newCard, parseCard, review } from "@/lib/srs/schedule";
import { EMPTY_SRS, parseSrs, withCardsFor } from "@/lib/srs/store";

const T0 = 1_000_000_000_000;

describe("the scheduler", () => {
  it("brings a new word back tomorrow when it is remembered, later when it is easy", () => {
    const c = newCard("es:hola", T0);
    expect(review(c, "good", T0)).toMatchObject({ interval: 1, due: T0 + DAY_MS, reps: 1 });
    expect(review(c, "easy", T0)).toMatchObject({ interval: 4, reps: 1 });
  });

  it("spaces a word that keeps being remembered further apart each time", () => {
    let c = newCard("es:hola", T0);
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) { c = review(c, "good", c.due); gaps.push(c.interval); }
    expect(gaps[0]).toBe(1);
    expect(gaps[1]).toBe(3);
    for (let i = 2; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it("sends a forgotten word back to ten minutes from now, and lowers its ease, never below the floor", () => {
    let c = review(review(newCard("es:hola", T0), "good", T0), "good", T0 + DAY_MS);
    c = review(c, "again", T0 + 5 * DAY_MS);
    expect(c).toMatchObject({ interval: 0, reps: 0, lapses: 1, due: T0 + 5 * DAY_MS + RELEARN_MS });
    expect(c.ease).toBeLessThan(START_EASE);
    for (let i = 0; i < 20; i++) c = review(c, "again", T0);
    expect(c.ease).toBe(MIN_EASE);
  });

  it("raises the ease for an easy answer", () => {
    expect(review(newCard("a", T0), "easy", T0).ease).toBeGreaterThan(START_EASE);
  });

  it("lists what is due, the longest overdue first", () => {
    const cards = [{ ...newCard("a", T0), due: T0 + 10 }, { ...newCard("b", T0), due: T0 - 5 }, { ...newCard("c", T0), due: T0 - 50 }];
    expect(dueCards(cards, T0).map((c) => c.id)).toEqual(["c", "b"]);
  });
});

describe("the flashcards' store", () => {
  it("gives every saved word a card and drops the card of a word taken out", () => {
    const saved = { "es:hola": { word: "hola", lang: "es", meaning: "hello", book: "b", at: 1 } };
    const a = withCardsFor(EMPTY_SRS, saved, T0);
    expect(Object.keys(a.cards)).toEqual(["es:hola"]);
    expect(withCardsFor(a, saved, T0 + 5)).toBe(a);
    expect(withCardsFor(a, {}, T0).cards).toEqual({});
  });

  it("reads a corrupt value as empty and keeps what is valid", () => {
    for (const bad of [null, "", "nope", "[]", "3"]) expect(parseSrs(bad as string)).toEqual(EMPTY_SRS);
    const s = parseSrs(JSON.stringify({ cards: { "es:a": { due: 5, interval: 2, ease: 99, reps: 1, lapses: 0 }, "es:b": 7 }, log: { "2026-10-01": 4, nope: 3, "2026-10-02": -1 } }));
    expect(Object.keys(s.cards)).toEqual(["es:a"]);
    expect(s.cards["es:a"].ease).toBe(3.5);
    expect(s.log).toEqual({ "2026-10-01": 4 });
    expect(parseCard("x", null)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { answer, chanceCorrect, isDone, MAX_QUESTIONS, newState, nextItem, resultOf, shuffled, type State } from "@/lib/placement/engine";
import { BANK_EN } from "@/lib/placement/bank-en";

/** A small seeded generator, so a simulated reader gives the same test every time. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A reader whose real level is `level` (0–5): answers by the same model the test assumes. */
function sit(level: number, seed: number): { result: number; asked: number } {
  const r = rng(seed);
  let s: State = newState();
  while (!isDone(s, BANK_EN.length)) {
    const item = nextItem(s, BANK_EN, r)!;
    // A reader fully at a level is a little better than the level's own difficulty.
    const correct = r() < chanceCorrect(level + 0.5, item.level);
    s = answer(s, item, correct);
  }
  return { result: ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(resultOf(s)), asked: s.history.length };
}

describe("the placement bank", () => {
  it("has ten questions at each of the six levels, with unique ids", () => {
    expect(BANK_EN).toHaveLength(60);
    expect(new Set(BANK_EN.map((i) => i.id)).size).toBe(60);
    for (let level = 0; level < 6; level++) expect(BANK_EN.filter((i) => i.level === level)).toHaveLength(10);
  });

  it("is well formed: four distinct options, a real answer, a blank to fill where it is a sentence", () => {
    for (const i of BANK_EN) {
      expect(i.options, i.id).toHaveLength(4);
      expect(new Set(i.options).size, i.id).toBe(4);
      expect(i.answer, i.id).toBeGreaterThanOrEqual(0);
      expect(i.answer, i.id).toBeLessThan(4);
      if (i.kind !== "reading" && !i.prompt.includes("?")) expect(i.prompt, i.id).toContain("___");
      if (i.kind === "reading") expect(i.passage, i.id).toBeTruthy();
    }
  });

  it("keeps the right answer right when the options are shuffled for the screen", () => {
    const r = rng(3);
    const places = [0, 0, 0, 0];
    for (const i of BANK_EN) {
      const sh = shuffled(i, r);
      expect([...sh.options].sort()).toEqual([...i.options].sort());
      expect(sh.options[sh.answer], i.id).toBe(i.options[i.answer]);
      places[sh.answer]++;
    }
    for (const n of places) expect(n).toBeGreaterThanOrEqual(8);
  });
});

describe("the engine", () => {
  it("moves the estimate up for a right answer and down for a wrong one", () => {
    const s = newState();
    const hard = { id: "x", level: 4 };
    expect(answer(s, hard, true).theta).toBeGreaterThan(s.theta);
    expect(answer(s, hard, false).theta).toBeLessThan(s.theta);
  });

  it("rewards a hard right answer more than an easy one, and punishes an easy wrong answer more than a hard one", () => {
    const s = newState();
    expect(answer(s, { id: "h", level: 5 }, true).theta - s.theta).toBeGreaterThan(answer(s, { id: "e", level: 0 }, true).theta - s.theta);
    expect(s.theta - answer(s, { id: "e", level: 0 }, false).theta).toBeGreaterThan(s.theta - answer(s, { id: "h", level: 5 }, false).theta);
  });

  it("never asks the same question twice, and never more than its maximum", () => {
    const r = rng(1);
    let s = newState();
    const seen = new Set<string>();
    while (!isDone(s, BANK_EN.length)) {
      const item = nextItem(s, BANK_EN, r)!;
      expect(seen.has(item.id)).toBe(false);
      seen.add(item.id);
      s = answer(s, item, r() < 0.5);
    }
    expect(s.history.length).toBeLessThanOrEqual(MAX_QUESTIONS);
  });

  it("places a simulated reader within one level of where they are, nearly every time", () => {
    for (let level = 0; level < 6; level++) {
      let within = 0, exact = 0, longest = 0;
      const runs = 150;
      for (let n = 0; n < runs; n++) {
        const { result, asked } = sit(level, level * 1000 + n + 1);
        if (Math.abs(result - level) <= 1) within++;
        if (result === level) exact++;
        longest = Math.max(longest, asked);
      }
      expect(within / runs, `level ${level} within one`).toBeGreaterThanOrEqual(0.9);
      expect(exact / runs, `level ${level} exact`).toBeGreaterThanOrEqual(0.4);
      expect(longest).toBeLessThanOrEqual(MAX_QUESTIONS);
    }
  });

  it("puts a reader who guesses at random near the bottom", () => {
    const r = rng(7);
    let total = 0;
    const runs = 100;
    for (let n = 0; n < runs; n++) {
      let s = newState();
      while (!isDone(s, BANK_EN.length)) s = answer(s, nextItem(s, BANK_EN, r)!, r() < 0.25);
      total += ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(resultOf(s));
    }
    expect(total / runs).toBeLessThan(1.2);
  });
});

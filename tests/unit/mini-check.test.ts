import { describe, expect, it } from "vitest";
import { blockFinished } from "@/lib/quiz/blocks";
import { cheerFor } from "@/lib/quiz/cheers";
import { BLOCK, miniQuestions, pageItems, type QuizPage } from "@/lib/quiz/mini";
import { parsePrefs } from "@/lib/reading/prefs";

const fr = [
  ["Marie ouvre la porte de la maison. Elle voit un grand chien noir.", "Marie opens the door of the house. She sees a big black dog.", [["porte", "door"], ["maison", "house"], ["chien", "dog"]]],
  ["Le chien mange du pain dans la cuisine. Marie rit beaucoup.", "The dog eats some bread in the kitchen. Marie laughs a lot.", [["cuisine", "kitchen"], ["pain", "bread"]]],
  ["Après le dîner, ils vont au jardin. Le soleil est très chaud.", "After dinner, they go to the garden. The sun is very hot.", [["jardin", "garden"], ["soleil", "sun"]]],
  ["Marie lit un livre sous un arbre. Le chien dort à côté d'elle.", "Marie reads a book under a tree. The dog sleeps beside her.", [["livre", "book"], ["arbre", "tree"]]],
  ["Le soir, la lune arrive au-dessus du village. Tout le monde rentre.", "In the evening, the moon rises above the village. Everyone goes home.", [["lune", "moon"], ["village", "village"]]],
  ["Demain, ils partent pour la montagne. Le voyage sera long.", "Tomorrow, they leave for the mountain. The journey will be long.", [["montagne", "mountain"], ["voyage", "journey"]]],
  ["Marie prépare un grand sac rouge. Elle met un pull dedans.", "Marie packs a big red bag. She puts a sweater inside.", [["sac", "bag"], ["pull", "sweater"]]],
] as const;
const page = (i: number): QuizPage => ({ text: fr[i][0], translation: fr[i][1], keys: fr[i][2].map(([w, en]) => ({ w, en })) });
const pages = fr.map((_, i) => page(i));

describe("quick check after five pages", () => {
  it("is offered on arriving at the page after each fifth, moving forward one page, and not otherwise", () => {
    expect(BLOCK).toBe(5);
    expect(blockFinished(5, 4)).toBe(1);
    expect(blockFinished(10, 9)).toBe(2);
    expect(blockFinished(5, 6)).toBeNull(); // coming back
    expect(blockFinished(5, 0)).toBeNull(); // jumped (reopening on page 6)
    expect(blockFinished(6, 4)).toBe(1); // a fast swipe skipped a page
    expect(blockFinished(11, 9)).toBe(2);
    expect(blockFinished(6, 5)).toBeNull(); // already past the fifth
    expect(blockFinished(40, 5)).toBeNull(); // a long jump
    expect(blockFinished(4, 3)).toBeNull();
    expect(blockFinished(0, 0)).toBeNull();
  });

  it("makes the number of questions asked for, from the pages' own sentences, with four options and one right", () => {
    const asked = pageItems(pages.slice(0, 5));
    expect(asked.length).toBeGreaterThanOrEqual(5);
    for (const n of [3, 5, 10]) {
      const qs = miniQuestions({ lang: "fr", asked, pool: pageItems(pages), count: n, seed: 7 });
      expect(qs.length, `count ${n}`).toBeGreaterThanOrEqual(Math.min(n, 5));
      expect(qs.length).toBeLessThanOrEqual(n);
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options![q.answer!]).toBeTruthy();
        expect(["gap", "meaning", "vocab"]).toContain(q.kind);
      }
    }
  });

  it("is the same for the same seed, different for another", () => {
    const a = pageItems(pages.slice(0, 5));
    const run = (seed: number) => JSON.stringify(miniQuestions({ lang: "fr", asked: a, pool: pageItems(pages), count: 5, seed }));
    expect(run(1)).toBe(run(1));
    expect(run(1)).not.toBe(run(2));
  });

  it("asks only a gap when the pages have no English, and nothing when there is nothing to ask", () => {
    const bare = pages.slice(0, 5).map((p) => ({ text: p.text }));
    const qs = miniQuestions({ lang: "fr", asked: pageItems(bare), pool: pageItems(pages.map((p) => ({ text: p.text }))), count: 5, seed: 3 });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.kind === "gap")).toBe(true);
    expect(miniQuestions({ lang: "fr", asked: [], pool: [], count: 5, seed: 1 })).toEqual([]);
  });
});

describe("Pluto's cheers", () => {
  it("never on the first page, the end slide or twice in a row", () => {
    expect(cheerFor(0, 50, -99)).toBeNull();
    expect(cheerFor(50, 50, -99)).toBeNull();
    const seen: number[] = [];
    let last = -99;
    for (let i = 1; i < 50; i++) { const c = cheerFor(i, 50, last); if (c) { seen.push(i); last = i; } }
    expect(seen.length).toBeGreaterThan(3);
    expect(seen.length).toBeLessThan(15);
    for (let i = 1; i < seen.length; i++) expect(seen[i] - seen[i - 1]).toBeGreaterThanOrEqual(3);
  });
  it("marks the halfway point and invites a chat", () => {
    expect(cheerFor(24, 50, -99)?.id).toBe("cheer.half");
    expect(cheerFor(8, 200, -99)).toMatchObject({ id: "reader.cheer.talk", talk: true });
    expect(cheerFor(24, 200, -99)).toMatchObject({ id: "reader.cheer.pages", vars: { n: 25 } });
  });
});

describe("reader preferences for the check and the cheers", () => {
  it("default to asking and cheering, and keep what was chosen", () => {
    expect(parsePrefs(null)).toMatchObject({ quiz: true, cheers: true });
    expect(parsePrefs(JSON.stringify({ quiz: false, cheers: false }))).toMatchObject({ quiz: false, cheers: false });
    // The old "Stop asking" setting does not keep the quiz off.
    expect(parsePrefs(JSON.stringify({ check: 0 })).quiz).toBe(true);
  });
});

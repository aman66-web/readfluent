import { describe, expect, it } from "vitest";
import { keySpans } from "@/lib/reading/keys";
import { linkKeys, findRun, type Hit } from "@/lib/translate/wordalign";

const en = "In the story The Blue Cross, a boat reaches Harwich early in the morning.";
const fr = "Dans l'histoire The Blue Cross, un bateau arrive à Harwich tôt le matin.";
// What a translator says for each English word marked in turn (index among the English words).
const hits: Hit[] = [
  { ei: 0, got: "dans" }, { ei: 1, got: "l" }, { ei: 2, got: "histoire" }, { ei: 3, got: "the" }, { ei: 4, got: "blue" }, { ei: 5, got: "cross" },
  { ei: 6, got: "un" }, { ei: 7, got: "bateau" }, { ei: 8, got: "arrive" }, { ei: 9, got: "harwich" }, { ei: 10, got: "tôt" },
  { ei: 11, got: "dans" }, // a repeat of a word that stands far away: refused
  { ei: 13, got: "matin" },
];

describe("matching every word of a page", () => {
  const keys = linkKeys(en, fr, hits);
  const target = keySpans(fr, keys, "w");
  const english = keySpans(en, keys, "en");
  const colour = (text: string, spans: Map<number, number>, word: string) => spans.get(text.indexOf(word));

  it("joins words that point at one place: the + story is l'histoire", () => {
    const k = keys[colour(fr, target, "l'histoire") as number];
    expect(k.en).toBe("the story");
    expect(colour(en, english, "story")).toBe(colour(en, english, "the"));
  });

  it("gives the English words the colour number of their page words, on both sides", () => {
    for (const [w, e] of [["bateau", "boat"], ["arrive", "reaches"], ["Harwich", "Harwich"], ["matin", "morning"], ["un", "a"], ["Dans", "In"]] as const) {
      const ki = colour(fr, target, w);
      expect(ki, w).toBeDefined();
      expect(colour(en, english, e), e).toBe(ki);
    }
  });

  it("matches left-over words that sit in the same gap of both lines (in the = le)", () => {
    const k = keys.find((x) => x.w === "le");
    expect(k?.en).toBe("in the");
  });

  it("does not colour a word with no partner (the page's \"à\")", () => {
    expect(colour(fr, target, "à")).toBeUndefined();
  });

  it("keeps matches written by hand and fits the rest around them", () => {
    const hand = [{ w: "jeune homme", en: "young man" }];
    const e2 = "She hopes the young man will come.";
    const f2 = "Elle espère que le jeune homme viendra.";
    const k = linkKeys(e2, f2, [{ ei: 1, got: "espère" }, { ei: 6, got: "viendra" }], hand);
    expect(k.map((x) => [x.w, x.en])).toEqual(expect.arrayContaining([["espère", "hopes"], ["jeune homme", "young man"], ["viendra", "come"]]));
    // "the" / "que le" is the one gap left, matched to each other
    expect(k.some((x) => x.en === "the" && /le/.test(x.w))).toBe(true);
  });

  it("finds a phrase nearest where it would stand, and never a far-off look-alike", () => {
    const words = ["le", "chat", "voit", "le", "chien"];
    expect(findRun(words, "le", 3, () => true)).toEqual([3, 3]);
    expect(findRun(words, "le", 0, () => true)).toEqual([0, 0]);
    expect(findRun(["a", "b", "c", "d", "e", "f", "g", "h", "i", "z"], "z", 0, () => true)).toBeNull();
  });

  it("does nothing when there is nothing to match", () => {
    expect(linkKeys("", fr, [])).toEqual([]);
    expect(linkKeys(en, fr, [])).toEqual([]);
  });
});

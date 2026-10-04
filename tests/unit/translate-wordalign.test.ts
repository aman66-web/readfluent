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

describe("languages written without spaces", () => {
  it("breaks Japanese into words to tap, not into whole clauses", async () => {
    const { tokenize } = await import("@/lib/reading/sentences");
    const ja = "彼女は、若い男性が彼女の娘の一人と結婚することを望んでいます。";
    const words = tokenize(ja).filter((t) => t.word).map((t) => t.text);
    expect(words.length).toBeGreaterThan(8);
    expect(words).toContain("彼女");
    expect(words.join("")).toBe(ja.replace(/[、。]/g, ""));
    // every token still points at its place in the text
    for (const t of tokenize(ja)) expect(ja.slice(t.start, t.start + t.text.length)).toBe(t.text);
    const zh = tokenize("我每天早上喝咖啡。").filter((t) => t.word).map((t) => t.text);
    expect(zh.length).toBeGreaterThan(3);
  });
  it("matches Japanese words to the English line", () => {
    const e = "She hopes the young man will marry.";
    const j = "彼女は若い男性が結婚することを望んでいます。";
    const k = linkKeys(e, j, [{ ei: 0, got: "彼女" }, { ei: 3, got: "若い男性" }, { ei: 4, got: "若い男性" }, { ei: 1, got: "望んでいます" }]);
    expect(k.some((x) => x.en === "She" || x.en === "she")).toBe(true);
    expect(k.find((x) => x.en === "young man")?.w.replace(/ /g, "")).toBe("若い男性");
  });
});

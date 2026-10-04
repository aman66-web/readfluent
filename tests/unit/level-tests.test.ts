import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sentenceRanges } from "@/lib/reading/sentences";
import { buildLevelTest } from "@/lib/tests/level/build";
import { gradeDictation, gradeSpeech, gradeWriting, isLatinText, similarity, wordCount } from "@/lib/tests/level/grade";
import { levelPairs } from "@/lib/tests/level/pool";
import { LEVEL_TESTS_KEY, earnedLevels, parseLevelResults, passedCount } from "@/lib/tests/level/store";
import { TESTS_PER_LEVEL, levelPassMark, stepPoints, type LevelPassage } from "@/lib/tests/level/types";
import { CEFR } from "@/lib/xp/levels";

const DIR = path.join(process.cwd(), "lib/tests/reading");
type File = { lang: string; levels: Record<string, { title: string; text: string; keys: string[]; qs?: LevelPassage["qs"]; write?: LevelPassage["write"] }[]> };
const read = (lang: string): File => JSON.parse(fs.readFileSync(path.join(DIR, `${lang}.json`), "utf8"));
const en = read("en");
const sentences = (t: string) => sentenceRanges(t).length;

describe("level test passages (English source)", () => {
  for (const level of CEFR) {
    it(`${level}: ten passages with four questions, a writing task and keys that are in the text`, () => {
      const ps = en.levels[level];
      expect(ps.length).toBe(TESTS_PER_LEVEL);
      for (const p of ps) {
        expect(p.title.trim() && p.text.trim()).toBeTruthy();
        expect(p.qs).toHaveLength(4);
        for (const q of p.qs!) { expect(q.o).toHaveLength(4); expect(q.a).toBeGreaterThanOrEqual(0); expect(q.a).toBeLessThan(4); expect(new Set(q.o).size).toBe(4); }
        expect(p.write!.prompt.length).toBeGreaterThan(10);
        expect(p.keys.length).toBeGreaterThanOrEqual(3);
        for (const k of p.keys) expect(p.text.toLowerCase(), `${level} key ${k}`).toContain(k.toLowerCase());
      }
    });
  }
});

const TRANSLATED = fs.readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "en.json").map((f) => f.slice(0, -5));
describe("level test passages (translations)", () => {
  for (const lang of TRANSLATED) {
    it(`${lang}: 6 levels × 10 passages, as many sentences as the English, keys in the text`, () => {
      const f = read(lang);
      expect(f.lang).toBe(lang);
      for (const level of CEFR) {
        expect(f.levels[level], `${lang} ${level}`).toHaveLength(TESTS_PER_LEVEL);
        f.levels[level].forEach((p, i) => {
          expect(p.title.trim(), `${lang} ${level} ${i + 1} title`).toBeTruthy();
          expect(p.text.trim(), `${lang} ${level} ${i + 1} text`).toBeTruthy();
          expect(p.text, `${lang} ${level} ${i + 1} is not just the English`).not.toBe(en.levels[level][i].text);
          expect(Math.abs(sentences(p.text) - sentences(en.levels[level][i].text)), `${lang} ${level} ${i + 1} sentences`).toBeLessThanOrEqual(1);
          expect(p.keys.length, `${lang} ${level} ${i + 1} keys`).toBeGreaterThanOrEqual(2);
          for (const k of p.keys) expect(p.text.toLowerCase(), `${lang} ${level} ${i + 1} key ${k}`).toContain(k.toLowerCase());
          expect(/\d/.test(p.text), `${lang} ${level} ${i + 1} digits`).toBe(false);
        });
      }
    });
  }
});

const passagesOf = (lang: string, level: (typeof CEFR)[number]): LevelPassage[] => {
  const base = en.levels[level];
  const mine = read(lang).levels[level];
  return mine.map((m, i) => ({ title: m.title, text: m.text, keys: m.keys, qs: base[i].qs!, write: base[i].write! }));
};

describe("building a level test", () => {
  const pairs: [string, string][] = Array.from({ length: 30 }, (_, i) => [`word${i}`, `meaning ${i}`]);
  const make = (n: number, level: (typeof CEFR)[number] = "A2") => buildLevelTest({ lang: "en", level, n, passages: passagesOf("en", level), pairs });

  it("is the same test every time, and different for each number", () => {
    expect(make(3)).toEqual(make(3));
    expect(JSON.stringify(make(3))).not.toBe(JSON.stringify(make(4)));
  });

  it("has reading, words, listening, dictation, writing and speaking, worth 14 points", () => {
    for (const level of CEFR) {
      for (let n = 1; n <= TESTS_PER_LEVEL; n++) {
        const t = make(n, level)!;
        const count = (p: string) => t.steps.filter((s) => s.part === p).length;
        expect([count("read"), count("vocab"), count("listen"), count("dictate"), count("write"), count("speak")], `${level} ${n}`).toEqual([4, 3, 2, 1, 1, 2]);
        expect(t.steps.reduce((x, s) => x + stepPoints(s), 0)).toBe(14);
        for (const s of t.steps) {
          if (s.part === "listen" || s.part === "vocab") { expect(s.question.options).toHaveLength(4); expect(s.question.options![s.question.answer!]).toBeTruthy(); }
          if (s.part === "speak") expect(s.text.length).toBeGreaterThan(5);
        }
      }
    }
  });

  it("asks no vocabulary when there is none to ask, and refuses a number that is not a test", () => {
    const t = buildLevelTest({ lang: "en", level: "A1", n: 1, passages: passagesOf("en", "A1"), pairs: [] })!;
    expect(t.steps.some((s) => s.part === "vocab")).toBe(false);
    expect(make(0)).toBeNull();
    expect(make(11)).toBeNull();
  });

  it("pass mark is 70%, rounded up", () => {
    expect(levelPassMark(14)).toBe(10);
    expect(levelPassMark(12)).toBe(9);
    expect(levelPassMark(10)).toBe(7);
  });
});

describe("marking", () => {
  it("dictation forgives a slip, accents and punctuation, not a different sentence", () => {
    expect(gradeDictation("Ella se llama María.", "ella se llama maria")).toBe(true);
    expect(gradeDictation("Ella se llama María.", "ella se llama Mario")).toBe(true);
    expect(gradeDictation("Ella se llama María.", "yo como pan")).toBe(false);
    expect(similarity("今日は天気がいいです。", "今日は天気がいいです")).toBe(1);
  });
  it("speech passes when most of the words were heard", () => {
    expect(gradeSpeech("The old library is in the centre of town.", "the old library is in the center of town")).toBe(true);
    expect(gradeSpeech("The old library is in the centre of town.", "old library centre town")).toBe(false);
    expect(gradeSpeech("The old library is in the centre of town.", "banana")).toBe(false);
  });
  it("counts words, also in scripts with no spaces", () => {
    expect(wordCount("one two three")).toBe(3);
    expect(wordCount("我每天早上喝咖啡")).toBeGreaterThanOrEqual(3);
  });
  it("writing: 1 point for length, 1 for using the passage's words, a copy of the prompt earns nothing", () => {
    const keys = ["library", "friday"];
    expect(gradeWriting("I go to the library every Friday after school", 6, keys)).toMatchObject({ points: 2 });
    expect(gradeWriting("I go there every day after school", 6, keys)).toMatchObject({ points: 1, onTopic: false });
    expect(gradeWriting("library", 6, keys)).toMatchObject({ points: 1, long: false, onTopic: true });
    expect(gradeWriting("Where does he go and why", 5, ["go"], { prompt: "Where does he go and why" }).points).toBe(0);
  });
  it("writing in Latin letters counts for a romanised language", () => {
    const roman = (s: string) => (s === "किताब" ? "kitab" : s);
    expect(isLatinText("mujhe kitab pasand hai")).toBe(true);
    expect(isLatinText("मुझे किताब पसंद है")).toBe(false);
    expect(gradeWriting("mujhe kitab pasand hai bahut", 4, ["किताब"], { roman }).onTopic).toBe(true);
  });
});

describe("level test results", () => {
  it("count the tests passed, and a level is earned at ten", () => {
    const all: Record<string, unknown> = {};
    for (let n = 1; n <= 10; n++) all[`es:B1:${n}`] = { points: 12, total: 14, passed: n !== 4, plays: 1, at: 1 };
    const r = parseLevelResults(JSON.stringify(all));
    expect(passedCount(r, "es", "B1")).toBe(9);
    expect(earnedLevels(r, "es")).toEqual([]);
    all["es:B1:4"] = { points: 11, total: 14, passed: true, plays: 2, at: 2 };
    expect(earnedLevels(parseLevelResults(JSON.stringify(all)), "es")).toEqual(["B1"]);
    expect(earnedLevels(parseLevelResults(JSON.stringify(all)), "fr")).toEqual([]);
  });
  it("ignores junk", () => {
    expect(parseLevelResults("nope")).toEqual({});
    expect(parseLevelResults(JSON.stringify({ "es:A1:1": { points: 99, total: 14, passed: "yes" } }))["es:A1:1"]).toMatchObject({ points: 14, passed: false });
    expect(LEVEL_TESTS_KEY).toContain("level-tests");
  });
  it("vocabulary pools exist for every level from the decks", () => {
    const deck = Array.from({ length: 100 }, (_, i) => ({ t: `d${i}`, en: `m${i}` }));
    const topics = { greetings: Array.from({ length: 25 }, (_, i) => ({ t: `g${i}`, en: `x${i}` })) };
    for (const l of CEFR) expect(levelPairs(l, deck, topics).length).toBeGreaterThanOrEqual(8);
  });
});

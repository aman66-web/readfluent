import { describe, expect, it } from "vitest";
import corpusEn from "@/lib/tests/corpus.en.json";
import corpusEs from "@/lib/tests/corpus.es.json";
import { makePaper, namesOf, type Item } from "@/lib/tests/build";
import { supportFor } from "@/lib/tests/support";
import { PAPER_SIZE, type Question } from "@/lib/tests/types";
import { CEFR } from "@/lib/xp/levels";

const ES = corpusEs as Item[];
const EN = corpusEn as Item[];

function valid(q: Question) {
  if (q.kind === "order") {
    expect(q.words!.length).toBe(q.solution!.length);
    expect([...q.words!].sort()).toEqual([...q.solution!].sort());
    expect(q.words!.join(" ")).not.toBe(q.solution!.join(" "));
  } else {
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(q.answer).toBeLessThan(4);
  }
  if (q.kind === "gap") expect(q.prompt).toContain("____");
  if (q.kind === "listen") expect(q.say).toBeTruthy();
}

describe("the tests", () => {
  it("make a full paper of every kind at every level for Spanish, each with one right answer", () => {
    const s = supportFor("es")!;
    for (const level of CEFR) for (const kind of s.kinds) {
      const paper = makePaper({ lang: "es", level, kind, bank: ES, seed: 11 });
      expect(paper.questions.length, `${level} ${kind}`).toBeGreaterThanOrEqual(PAPER_SIZE - 2);
      paper.questions.forEach(valid);
      // The right answer is among the options and the other three are not it.
      for (const q of paper.questions) if (q.options) expect(q.options.filter((o) => o === q.options![q.answer!])).toHaveLength(1);
    }
  }, 30_000);

  it("make cloze, word-order and listening papers of English at every level", () => {
    for (const level of CEFR) for (const kind of supportFor("en")!.kinds) {
      const paper = makePaper({ lang: "en", level, kind, bank: EN, seed: 5 });
      expect(paper.questions.length, `${level} ${kind}`).toBeGreaterThanOrEqual(PAPER_SIZE - 2);
      paper.questions.forEach(valid);
    }
  }, 30_000);

  it("ask word-order only with the sentence's English, as a whole sentence", () => {
    expect(supportFor("en")!.kinds).not.toContain("order");
    for (const level of ["A1", "B1", "C2"] as const) {
      const paper = makePaper({ lang: "es", level, kind: "order", bank: ES, seed: 3 });
      expect(paper.questions.length, level).toBeGreaterThanOrEqual(4);
      for (const q of paper.questions) {
        expect(q.prompt).toBeTruthy();
        expect(q.solution!.join(" ")).toBe(q.reveal!.text.match(/[\p{L}\p{N}'’-]+/gu)!.join(" "));
      }
    }
    // A mixed English paper has no order questions either.
    expect(makePaper({ lang: "en", level: "B1", kind: "mixed", bank: EN, seed: 2 }).questions.some((q) => q.kind === "order")).toBe(false);
  });

  it("do not let a name in the sentence give the meaning answer away", () => {
    const names = namesOf;
    for (let seed = 1; seed <= 5; seed++) {
      for (const q of makePaper({ lang: "es", level: "C2", kind: "meaning", bank: ES, seed }).questions) {
        const right = q.options![q.answer!];
        const only = names(right).filter((n) => q.options!.filter((o) => o.includes(n)).length === 1);
        expect(only, right).toEqual([]);
      }
    }
  });

  it("are the same for the same seed and different for another", () => {
    const a = makePaper({ lang: "es", level: "B1", kind: "mixed", bank: ES, seed: 1 });
    const b = makePaper({ lang: "es", level: "B1", kind: "mixed", bank: ES, seed: 1 });
    const c = makePaper({ lang: "es", level: "B1", kind: "mixed", bank: ES, seed: 2 });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it("offer a language only what it has", () => {
    expect(supportFor("es")!.levels).toHaveLength(6);
    expect(supportFor("en")!.kinds).not.toContain("meaning");
    expect(supportFor("fr")!.kinds).toEqual(["vocab"]);
    expect(supportFor("fr")!.levels).toEqual(["A1", "A2"]);
    expect(supportFor(null)).toBeNull();
  });
});

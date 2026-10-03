import { describe, expect, it } from "vitest";
import { EXAM, EXAM_LEVELS, examPassed, gatedLevelsFor, heldXp, passMark, pendingExam } from "@/lib/xp/exam";
import { EMPTY_LEDGER, examDue, parseLedger, rawXp, totalXp, type Ledger } from "@/lib/xp/ledger";
import { LEVEL_FLOOR, levelFromXp } from "@/lib/xp/levels";
import { makePaper } from "@/lib/tests/build";
import { parseExams } from "@/lib/tests/exam-store";
import es from "@/lib/tests/corpus.es.json";
import en from "@/lib/tests/corpus.en.json";

const ledger = (over: Partial<Ledger>): Ledger => ({ ...EMPTY_LEDGER, ...over });

describe("the exam rules", () => {
  it("is forty questions, thirty minutes and three in four to pass", () => {
    expect(EXAM).toMatchObject({ questions: 40, minutes: 30, passShare: 0.75 });
    expect(passMark(40)).toBe(30);
    expect(examPassed(30, 40)).toBe(true);
    expect(examPassed(29, 40)).toBe(false);
    // A paper too short to be an exam passes nobody.
    expect(examPassed(10, 10)).toBe(false);
  });

  it("has an exam for every level above A1, and gates only what a language can examine", () => {
    expect(EXAM_LEVELS).toEqual(["A2", "B1", "B2", "C1", "C2"]);
    expect(gatedLevelsFor("es")).toEqual(EXAM_LEVELS);
    expect(gatedLevelsFor("en")).toEqual(EXAM_LEVELS);
    expect(gatedLevelsFor("it")).toEqual(["A2"]);
    expect(gatedLevelsFor(null)).toEqual([]);
  });
});

describe("a reader held at the door of the next level", () => {
  const gates = [...EXAM_LEVELS];
  const a2 = LEVEL_FLOOR.A2;

  it("is not held before the XP is there, or with no gates set", () => {
    expect(pendingExam({ base: 0, raw: a2 - 5, gates, exams: [] })).toBeNull();
    expect(heldXp({ base: 0, raw: a2 + 900 })).toBe(a2 + 900);
    expect(heldXp({ base: 0, raw: a2 + 900, gates: [] })).toBe(a2 + 900);
  });

  it("is held one XP short of the level whose exam is waiting, however much more it earns", () => {
    expect(pendingExam({ base: 0, raw: a2, gates, exams: [] })).toBe("A2");
    expect(heldXp({ base: 0, raw: a2 + 5000, gates, exams: [] })).toBe(a2 - 1);
    const held = levelFromXp(heldXp({ base: 0, raw: a2 + 5000, gates, exams: [] }));
    expect(held.level).toBe("A1");
    expect(held.stage).toBe(3);
  });

  it("moves up the moment the exam is passed, and is held again at the next door", () => {
    expect(heldXp({ base: 0, raw: a2 + 5000, gates, exams: ["A2"] })).toBe(a2 + 5000);
    expect(levelFromXp(heldXp({ base: 0, raw: a2 + 5000, gates, exams: ["A2"] })).level).toBe("A2");
    expect(heldXp({ base: 0, raw: LEVEL_FLOOR.B1 + 10, gates, exams: ["A2"] })).toBe(LEVEL_FLOOR.B1 - 1);
    expect(pendingExam({ base: 0, raw: LEVEL_FLOOR.B1 + 10, gates, exams: ["A2", "B1"] })).toBeNull();
  });

  it("is never held at a level it started at or below (placed there, not earned)", () => {
    expect(pendingExam({ base: LEVEL_FLOOR.B1, raw: LEVEL_FLOOR.B1 + 10, gates, exams: [] })).toBeNull();
    expect(pendingExam({ base: LEVEL_FLOOR.B1, raw: LEVEL_FLOOR.B2 + 10, gates, exams: [] })).toBe("B2");
  });

  it("is only held at levels its language can examine", () => {
    expect(pendingExam({ base: 0, raw: LEVEL_FLOOR.B1 + 10, gates: ["A2"], exams: ["A2"] })).toBeNull();
  });

  it("shows in the ledger: the XP that counts is held, the XP earned is kept", () => {
    const l = ledger({ earned: LEVEL_FLOOR.A2 + 700, gates });
    expect(rawXp(l)).toBe(LEVEL_FLOOR.A2 + 700);
    expect(totalXp(l)).toBe(LEVEL_FLOOR.A2 - 1);
    expect(examDue(l)).toBe("A2");
    const passed = ledger({ earned: LEVEL_FLOOR.A2 + 700, gates, exams: ["A2"] });
    expect(totalXp(passed)).toBe(LEVEL_FLOOR.A2 + 700);
    expect(examDue(passed)).toBeNull();
  });

  it("is kept on the device and read back, and a corrupt list reads as none", () => {
    const l = ledger({ earned: 5, gates: ["A2", "B1"], exams: ["A2"] });
    const back = parseLedger(JSON.stringify(l));
    expect(back.gates).toEqual(["A2", "B1"]);
    expect(back.exams).toEqual(["A2"]);
    expect(parseLedger(JSON.stringify({ earned: 5, gates: ["Z9", 4, "A2"], exams: "no" })).gates).toEqual(["A2"]);
    expect(parseLedger(JSON.stringify({ earned: 5, gates: ["Z9", 4, "A2"], exams: "no" })).exams).toBeUndefined();
  });
});

describe("the exam paper", () => {
  it("has forty questions for every level of Spanish and English, of several kinds", () => {
    for (const [lang, bank] of [["es", es], ["en", en]] as const) {
      for (const level of EXAM_LEVELS) {
        const p = makePaper({ lang, level, kind: "mixed", bank: bank as never, seed: 11, size: EXAM.questions, exam: true });
        expect(p.questions, `${lang} ${level}`).toHaveLength(EXAM.questions);
        // English has no translations (no meaning, no word order), so its papers are gap and listening only.
        expect(new Set(p.questions.map((q) => q.kind)).size).toBeGreaterThanOrEqual(lang === "es" ? 3 : 2);
      }
    }
  });

  it("is a different paper for a different seed, and the same for the same", () => {
    const a = makePaper({ lang: "es", level: "B1", kind: "mixed", bank: es as never, seed: 1, size: 40, exam: true });
    const b = makePaper({ lang: "es", level: "B1", kind: "mixed", bank: es as never, seed: 2, size: 40, exam: true });
    const c = makePaper({ lang: "es", level: "B1", kind: "mixed", bank: es as never, seed: 1, size: 40, exam: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(c));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("is only the usual ten when no size is asked for", () => {
    expect(makePaper({ lang: "es", level: "A2", kind: "mixed", bank: es as never, seed: 5 }).questions.length).toBeLessThanOrEqual(10);
  });
});

describe("the record of tries", () => {
  it("reads back what was kept and nothing else", () => {
    const raw = JSON.stringify({ A2: { tries: 2, best: { correct: 28, total: 40, at: 5 }, last: { correct: 25, total: 40, at: 9 } }, A1: { tries: 1, best: { correct: 1, total: 2, at: 1 }, last: { correct: 1, total: 2, at: 1 } }, B1: "bad" });
    const r = parseExams(raw);
    expect(Object.keys(r)).toEqual(["A2"]);
    expect(r.A2?.best.correct).toBe(28);
    expect(parseExams("nope")).toEqual({});
  });
});

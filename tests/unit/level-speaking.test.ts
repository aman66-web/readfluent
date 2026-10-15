import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canListen, listenFail, listenOnce } from "@/lib/reading/listen";
import { buildLevelTest } from "@/lib/tests/level/build";
import { LEVEL_TESTS_KEY, parseLevelResults, saveLevelResult } from "@/lib/tests/level/store";
import { TESTS_PER_LEVEL, levelPassMark, scoreRun, stepPoints, stepsTotal, withoutSpeaking, type LevelPassage, type Marked } from "@/lib/tests/level/types";
import { CEFR, type Cefr } from "@/lib/xp/levels";

/**
 * Speaking in the level tests where nothing can hear the reader (App Review, 15 Oct 2026): inside the iPhone and Android
 * apps the web view has no working speech recognition, so the speaking steps are left out before the test starts and the
 * test is marked out of what is left. Left out must mean neither a point nor a miss, and passing must stay possible.
 */

afterEach(() => { vi.unstubAllGlobals(); });

type File = { levels: Record<string, (LevelPassage & { qs: LevelPassage["qs"]; write: LevelPassage["write"] })[]> };
const en = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/tests/reading/en.json"), "utf8")) as File;
const pairs: [string, string][] = Array.from({ length: 30 }, (_, i) => [`word${i}`, `meaning ${i}`]);
const make = (level: Cefr, n: number) => buildLevelTest({ lang: "en", level, n, passages: en.levels[level], pairs })!;

/** What a run records: each asked step with the points it got (here: the first `right` points, in order). */
function run(steps: ReturnType<typeof make>["steps"], right: number, speak: "left out" | "missed" | "heard" = "left out"): Marked[] {
  let left = right;
  const out: Marked[] = [];
  for (const s of steps) {
    const max = stepPoints(s);
    if (s.part === "speak") {
      if (speak === "left out") continue;
      out.push({ part: s.part, points: speak === "heard" ? 1 : 0, max });
      continue;
    }
    const got = Math.min(max, left);
    left -= got;
    out.push({ part: s.part, points: got, max });
  }
  return out;
}

describe("a level test without its speaking", () => {
  it("has no speaking steps, keeps every other step in order, and is out of 12 points (9 pass)", () => {
    for (const level of CEFR) {
      for (let n = 1; n <= TESTS_PER_LEVEL; n++) {
        const full = make(level, n);
        const quiet = withoutSpeaking(full);
        expect(quiet.steps.some((s) => s.part === "speak"), `${level} ${n}`).toBe(false);
        expect(quiet.steps).toEqual(full.steps.filter((s) => s.part !== "speak"));
        expect(stepsTotal(full.steps)).toBe(14);
        expect(stepsTotal(quiet.steps)).toBe(12);
        expect(levelPassMark(stepsTotal(quiet.steps))).toBe(9);
      }
    }
  });

  it("leaves the test itself as it was", () => {
    const full = make("B1", 2);
    const copy = JSON.parse(JSON.stringify(full));
    withoutSpeaking(full);
    expect(full).toEqual(copy);
  });
});

describe("scoring when speaking is left out", () => {
  const steps = make("A2", 5).steps;

  it("is out of the questions actually asked, and a full score passes", () => {
    expect(scoreRun(run(steps, 12))).toEqual({ points: 12, max: 12, passed: true });
  });

  it("passes at 70% of what is left: 9 of 12 passes, 8 of 12 does not", () => {
    expect(scoreRun(run(steps, 9))).toEqual({ points: 9, max: 12, passed: true });
    expect(scoreRun(run(steps, 8))).toEqual({ points: 8, max: 12, passed: false });
  });

  it("does not count a left-out sentence as a miss", () => {
    // The same answers: with speaking left out they pass; had both sentences been asked and failed, they would not.
    expect(scoreRun(run(steps, 9, "left out")).passed).toBe(true);
    expect(scoreRun(run(steps, 9, "missed"))).toEqual({ points: 9, max: 14, passed: false });
    expect(scoreRun(run(steps, 9, "heard"))).toEqual({ points: 11, max: 14, passed: true });
  });

  it("counts a sentence that was heard before the rest was left out", () => {
    // The first sentence was marked, then the recogniser said it could not go on: 9 + 1 out of 13 (pass mark 10).
    const marked = [...run(steps, 9), { part: "speak" as const, points: 1, max: 1 }];
    expect(scoreRun(marked)).toEqual({ points: 10, max: 13, passed: true });
  });

  it("never passes a run with nothing asked", () => {
    expect(scoreRun([])).toEqual({ points: 0, max: 0, passed: false });
  });

  it("is saved the same way: a pass out of 12 is kept as a pass", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
      addEventListener: () => {}, removeEventListener: () => {},
    });
    const { points, max, passed } = scoreRun(run(steps, 9));
    expect(saveLevelResult("es", "A2", 5, points, max).passed).toBe(passed);
    expect(parseLevelResults(store.get(LEVEL_TESTS_KEY))["es:A2:5"]).toMatchObject({ points: 9, total: 12, passed: true });
  });
});

/** A stand-in for the browser's recogniser: it reports `error`, or hears `said`, then ends. */
function fakeRecogniser(outcome: { error?: string; said?: string[] }) {
  const made = { count: 0 };
  class Fake {
    lang = ""; interimResults = false; continuous = false; maxAlternatives = 1;
    onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
    onerror: ((e: { error?: string }) => void) | null = null;
    onend: (() => void) | null = null;
    constructor() { made.count++; }
    start() {
      if (outcome.error) this.onerror?.({ error: outcome.error });
      else this.onresult?.({ results: [(outcome.said ?? []).map((transcript) => ({ transcript }))] });
      this.onend?.();
    }
    stop() {}
  }
  return { Fake, made };
}

describe("whether anything can hear the reader", () => {
  it("is no on the server, and in a browser with no speech recognition", () => {
    expect(typeof window).toBe("undefined");
    expect(canListen()).toBe(false);
    vi.stubGlobal("window", {});
    expect(canListen()).toBe(false);
  });

  it("is yes in a browser that has it (desktop Chrome, Safari)", () => {
    const { Fake } = fakeRecogniser({ said: ["hola"] });
    vi.stubGlobal("window", { webkitSpeechRecognition: Fake });
    expect(canListen()).toBe(true);
    const done = vi.fn();
    listenOnce("es", done);
    expect(done).toHaveBeenCalledWith(["hola"], undefined);
  });

  it("is no inside the iPhone and Android apps, even where the web view has the name, and nothing is started", () => {
    const { Fake, made } = fakeRecogniser({ said: ["hola"] });
    vi.stubGlobal("window", { webkitSpeechRecognition: Fake, SpeechRecognition: Fake, Capacitor: { isNativePlatform: () => true } });
    expect(canListen()).toBe(false);
    const done = vi.fn();
    listenOnce("es", done);
    expect(done).toHaveBeenCalledWith(null, "none");
    expect(made.count).toBe(0);
  });

  it("says a switched-off service or a missing language cannot work here, and a refused microphone is a refusal", () => {
    expect(listenFail("service-not-allowed")).toBe("none");
    expect(listenFail("language-not-supported")).toBe("none");
    expect(listenFail("not-allowed")).toBe("denied");
    expect(listenFail("network")).toBe("network");
    expect(listenFail("no-speech")).toBe("silent");
    expect(listenFail("aborted")).toBe("silent");
    expect(listenFail("audio-capture")).toBe("other");
    expect(listenFail(undefined)).toBe("other");
    const { Fake } = fakeRecogniser({ error: "service-not-allowed" });
    vi.stubGlobal("window", { webkitSpeechRecognition: Fake });
    const done = vi.fn();
    listenOnce("es", done);
    expect(done).toHaveBeenCalledWith(null, "none");
  });
});

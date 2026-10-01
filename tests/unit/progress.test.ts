import { describe, expect, it } from "vitest";
import { parseChoice, parseProgress, resumeIndex, versionKey } from "@/lib/progress";

describe("saved progress", () => {
  it("reads a good value", () => {
    expect(parseProgress('{"a/b1b2-50":3,"b/a1a2-100":0}')).toEqual({ "a/b1b2-50": 3, "b/a1a2-100": 0 });
  });

  it("never throws, and keeps nothing it cannot trust", () => {
    for (const bad of [null, undefined, "", "not json", "[]", "3", "null", '"x"']) expect(parseProgress(bad as string)).toEqual({});
    expect(parseProgress('{"ok":2,"neg":-1,"frac":1.5,"str":"3","nan":null}')).toEqual({ ok: 2 });
  });

  it("builds one key per version", () => {
    expect(versionKey("pride-and-prejudice", "B1B2", 50)).toBe("pride-and-prejudice/B1B2-50");
  });

  it("resumes on a page that exists", () => {
    expect(resumeIndex(undefined, 12)).toBe(0);
    expect(resumeIndex(5, 12)).toBe(5);
    expect(resumeIndex(99, 12)).toBe(11);
    expect(resumeIndex(-3, 12)).toBe(0);
    expect(resumeIndex(4, 0)).toBe(0);
  });
});

describe("the remembered level and length", () => {
  it("reads a good value and ignores a bad one", () => {
    expect(parseChoice('{"book":{"level":"B1B2","length":100}}')).toEqual({ book: { level: "B1B2", length: 100 } });
    expect(parseChoice('{"book":{"level":1,"length":"x"},"ok":{"level":"A1A2","length":50}}')).toEqual({ ok: { level: "A1A2", length: 50 } });
    for (const bad of [null, "", "{", "[]", "7"]) expect(parseChoice(bad as string)).toEqual({});
  });
});

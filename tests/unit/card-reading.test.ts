import { describe, expect, it } from "vitest";
import { hasRoman, romaniserFor, romanText } from "@/lib/romanise";

describe("the word card's reading in Latin letters", () => {
  it("is offered for the languages written in another script, and for no other", () => {
    for (const l of ["hi", "bn", "zh", "ur", "ar"]) expect(hasRoman(l)).toBe(true);
    for (const l of ["en", "es", "fr", "ja", "ru"]) expect(hasRoman(l)).toBe(false);
  });
  it("writes a tapped Hindi word in Latin letters", async () => {
    const fn = await romaniserFor("hi");
    const out = romanText("पुराने", fn!);
    expect(out).toMatch(/^[\p{Script=Latin}\p{M}]+$/u);
    expect(out.length).toBeGreaterThan(3);

  });
  it("writes a tapped Chinese word in pinyin", async () => {
    const fn = await romaniserFor("zh");
    expect(romanText("朋友", fn!)).toMatch(/péng\s*yǒu/);
  });
});

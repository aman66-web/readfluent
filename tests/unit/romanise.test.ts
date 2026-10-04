import { describe, expect, it } from "vitest";
import { romaniseBengali, romaniseHindi } from "@/lib/romanise/indic";
import { romaniseArabic } from "@/lib/romanise/arabic";
import { hasRoman, romaniserFor } from "@/lib/romanise";

describe("Hindi in Latin letters", () => {
  it.each([["आप", "aap"], ["कैसे", "kaise"], ["हैं", "hain"], ["नमस्ते", "namaste"], ["किताब", "kitaab"], ["भारत", "bhaarat"], ["हिन्दी", "hindee"], ["समझना", "samajhnaa"], ["लड़का", "larkaa"], ["कमल", "kamal"]])("%s -> %s", (hi, latin) => expect(romaniseHindi(hi)).toBe(latin));
  it("leaves what is not Hindi as it is", () => expect(romaniseHindi("hello")).toBe("hello"));
});

describe("Bengali in Latin letters", () => {
  it.each([["আমি", "ami"], ["ভালো", "bhalo"], ["আছি", "achhi"], ["বাংলা", "bangla"], ["ভাত", "bhat"]])("%s -> %s", (bn, latin) => expect(romaniseBengali(bn)).toBe(latin));
});

describe("Urdu and Arabic in Latin letters (approximate)", () => {
  it("reads written vowels and long vowels", () => {
    expect(romaniseArabic("آپ", "ur")).toBe("aap");
    expect(romaniseArabic("كَتَبَ", "ar")).toBe("kataba");
  });
  it("never throws and keeps unknown characters", () => expect(romaniseArabic("a1 ب", "ur")).toContain("a1"));
});

describe("which languages have it", () => {
  it("is for hi, bn, zh, ur and ar", () => {
    for (const l of ["hi", "bn", "zh", "ur", "ar"]) expect(hasRoman(l)).toBe(true);
    for (const l of ["es", "fr", "en", "ja"]) expect(hasRoman(l)).toBe(false);
  });
  it("turns Chinese into pinyin with tones", async () => {
    const r = await romaniserFor("zh");
    expect(r?.("你好")).toBe("nǐ hǎo");
  });
});

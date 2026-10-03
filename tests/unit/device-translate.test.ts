import { afterEach, describe, expect, it } from "vitest";
import { deviceKind, deviceStatus, deviceTranslate } from "@/lib/translate/device";
import { buildVariantWith, translatePages, wordCards, type TranslateFn } from "@/lib/translate/variant";

const fake: TranslateFn = async (texts, from, to) => texts.map((t) => `[${from}>${to}] ${t}`);

describe("a book translated by any translator", () => {
  it("translates every page in order and keeps the English as the line translation", async () => {
    const v = await translatePages(["One.", "Two."], "es", fake);
    expect(v.lang).toBe("es");
    expect(v.pages.map((p) => p.text)).toEqual(["[en>es] One.", "[en>es] Two."]);
    expect(v.pages[1].target?.translation).toBe("Two.");
  });

  it("makes a word card for every word, in the reader's own language", async () => {
    const v = await translatePages(["Hola mundo"], "es", async (t) => t);
    const dict = await wordCards(v, "en", fake);
    expect(Object.keys(dict).length).toBeGreaterThan(0);
    expect(Object.values(dict).every((e) => e.en.startsWith("[es>en]"))).toBe(true);
  });

  it("builds pages and cards together", async () => {
    const v = await buildVariantWith(["A cat."], "fr", "en", fake);
    expect(v.pages).toHaveLength(1);
    expect(v.dict && Object.keys(v.dict).length).toBeGreaterThan(0);
  });
});

describe("the device's own translator", () => {
  afterEach(() => { delete (globalThis as { Translator?: unknown }).Translator; });

  it("is absent outside the app and without a browser translator", async () => {
    expect(deviceKind()).toBeNull();
    expect(await deviceStatus("en", "es")).toBe("unsupported");
    await expect(deviceTranslate(["x"], "en", "es")).rejects.toThrow();
  });

  it("uses the browser's built-in translator where there is one, and remembers answers", async () => {
    let calls = 0;
    (globalThis as { Translator?: unknown }).Translator = {
      availability: async () => "available",
      create: async () => ({ translate: async (s: string) => { calls++; return `ES:${s}`; } }),
    };
    expect(deviceKind()).toBe("browser");
    expect(await deviceStatus("en", "es")).toBe("ready");
    expect(await deviceTranslate(["a", "b", "a"], "en", "es")).toEqual(["ES:a", "ES:b", "ES:a"]);
    const before = calls;
    expect(await deviceTranslate(["a"], "en", "es")).toEqual(["ES:a"]);
    expect(calls).toBe(before);
  });

  it("says a language must be downloaded when the browser needs to fetch it", async () => {
    (globalThis as { Translator?: unknown }).Translator = { availability: async () => "downloadable", create: async () => ({ translate: async (s: string) => s }) };
    expect(await deviceStatus("en", "ja")).toBe("download");
  });
});

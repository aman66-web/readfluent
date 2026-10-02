import { describe, expect, it } from "vitest";
import { chunk, googleCode, translateTexts, translatorConfigured } from "@/lib/translate/google";
import { buildVariant, uniqueWords } from "@/lib/translate/version";

/** A stand-in for the service: answers each string as "<to>:<string>", and says how it was asked. */
const fake = (calls: { q: string[]; source: string; target: string }[] = []) =>
  (async (_url: unknown, init: { body: string }) => {
    const body = JSON.parse(init.body) as { q: string[]; source: string; target: string };
    calls.push(body);
    return { ok: true, status: 200, json: async () => ({ data: { translations: body.q.map((q) => ({ translatedText: `${body.target}:${q.replace(/'/g, "&#39;")}` })) } }) };
  }) as unknown as typeof fetch;

describe("the machine translator", () => {
  it("is on only with a key, and renames the codes Google spells differently", () => {
    expect(translatorConfigured({})).toBe(false);
    expect(translatorConfigured({ GOOGLE_TRANSLATE_API_KEY: "  " })).toBe(false);
    expect(translatorConfigured({ GOOGLE_TRANSLATE_API_KEY: "k" })).toBe(true);
    expect(googleCode("zh")).toBe("zh-CN");
    expect(googleCode("es")).toBe("es");
  });

  it("splits a long list into requests the service takes, keeping every string once and in order", () => {
    const texts = Array.from({ length: 250 }, (_, i) => `line ${i}`);
    const jobs = chunk(texts);
    expect(jobs.length).toBeGreaterThan(1);
    expect(jobs.every((j) => j.texts.length <= 100)).toBe(true);
    expect(jobs.flatMap((j) => j.texts)).toEqual(texts);
    jobs.forEach((j) => expect(texts.slice(j.from, j.from + j.texts.length)).toEqual(j.texts));
    const big = chunk(["a".repeat(15_000), "b".repeat(15_000), "c"]);
    expect(big.map((j) => j.texts.length)).toEqual([1, 2]);
  });

  it("returns one answer for each string, in order, with the entities of the service undone", async () => {
    const calls: { q: string[]; source: string; target: string }[] = [];
    const texts = Array.from({ length: 230 }, (_, i) => `it's ${i}`);
    const out = await translateTexts(texts, "en", "zh", { key: "k", fetcher: fake(calls) });
    expect(out).toHaveLength(230);
    expect(out[0]).toBe("zh-CN:it's 0");
    expect(out[229]).toBe("zh-CN:it's 229");
    expect(calls.every((c) => c.source === "en" && c.target === "zh-CN")).toBe(true);
  });

  it("refuses without a key, and when the service answers wrongly", async () => {
    await expect(translateTexts(["a"], "en", "es", { key: "" })).rejects.toThrow("translator off");
    const bad = (async () => ({ ok: true, status: 200, json: async () => ({ data: { translations: [] } }) })) as unknown as typeof fetch;
    await expect(translateTexts(["a"], "en", "es", { key: "k", fetcher: bad })).rejects.toThrow();
    const down = (async () => ({ ok: false, status: 403, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(translateTexts(["a"], "en", "es", { key: "k", fetcher: down })).rejects.toThrow("403");
  });
});

describe("a version made by the translator", () => {
  it("lists each word once, in the order met", () => {
    expect(uniqueWords(["El baile, el señor.", "Señor Darcy"])).toEqual(["el", "baile", "señor", "darcy"]);
  });

  it("has a page for each English page, its English line, and a card for every word", async () => {
    const english = ["John studied.", "He joined the army."];
    const v = await buildVariant(english, "es", "fr", async (texts, from, to) => texts.map((t) => `${from}>${to}:${t}`));
    expect(v.lang).toBe("es");
    expect(v.pages.map((p) => p.text)).toEqual(["en>es:John studied.", "en>es:He joined the army."]);
    expect(v.pages[1].target?.translation).toBe("He joined the army.");
    expect(v.pages.map((p) => p.n)).toEqual([1, 2]);
    // The words of the Spanish page get a meaning in the language of the reader (French here).
    expect(v.dict?.["john"]?.en).toBe("es>fr:john");
    expect(Object.keys(v.dict ?? {})).toEqual(expect.arrayContaining(["en", "es", "john", "studied"]));
  });

  it("does not translate a word into the language it is already in", async () => {
    let calls = 0;
    const v = await buildVariant(["Hello."], "es", "es", async (texts) => { calls++; return texts.map((t) => t); });
    expect(calls).toBe(1);
    expect(v.dict?.["hello"]?.en).toBe("hello");
  });
});

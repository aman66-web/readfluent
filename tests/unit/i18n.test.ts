import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN, type MessageId } from "@/lib/i18n/en";
import { LANGUAGES } from "@/lib/onboarding/languages";

const ids = Object.keys(EN) as MessageId[];
const tokens = (s: string) => [...s.matchAll(/\{[a-zA-Z]+\}|<\/?link>/g)].map((m) => m[0]).sort();

describe("the languages", () => {
  const others = LANGUAGES.filter((l) => l.code !== "en");

  describe.each(others.map((l) => [l.code, l.label]))("%s (%s)", (code) => {
    it("has a catalog", () => {
      expect(existsSync(new URL(`../../lib/i18n/messages/${code}.ts`, import.meta.url)), `lib/i18n/messages/${code}.ts`).toBe(true);
    });

    it("has every message, and nothing else", async () => {
      const mod = await import(`../../lib/i18n/messages/${code}.ts`);
      const cat = mod.default as Record<string, string>;
      expect(Object.keys(cat).sort()).toEqual([...ids].sort());
    });

    it("keeps every {value} and <link> exactly, and leaves nothing blank", async () => {
      const cat = (await import(`../../lib/i18n/messages/${code}.ts`)).default as Record<string, string>;
      for (const id of ids) {
        expect(cat[id].trim(), `${code} ${id} is blank`).not.toBe("");
        expect(tokens(cat[id]), `${code} ${id}`).toEqual(tokens(EN[id]));
      }
    });

    it("keeps the app's name untranslated where English uses it", async () => {
      const cat = (await import(`../../lib/i18n/messages/${code}.ts`)).default as Record<string, string>;
      for (const id of ids) if (EN[id].includes("{app}")) expect(cat[id]).toContain("{app}");
    });
  });
});

describe("looking a message up", () => {
  it("fills in {values}, and falls back to English for a language without the message", async () => {
    const { translate } = await import("@/lib/i18n");
    expect(translate(null, "hello.bubble", { app: "ReadFluent" })).toBe("Hi there! I'm Lex. Welcome to ReadFluent!");
    const partial: Record<string, string> = { ...EN, "hello.bubble": "¡Hola! Soy Lex. Te damos la bienvenida a {app}." };
    expect(translate(partial as never, "hello.bubble", { app: "ReadFluent" })).toBe("¡Hola! Soy Lex. Te damos la bienvenida a ReadFluent.");
    // A value that was not given stays visible rather than turning into "undefined".
    expect(translate(null, "hello.bubble")).toBe("Hi there! I'm Lex. Welcome to {app}!");
    expect(translate(null, "path.days", { n: 114 })).toBe("114 days");
  });

  it("writes Arabic and Urdu right to left, and nothing else", async () => {
    const { isRtl } = await import("@/lib/i18n");
    expect(LANGUAGES.filter((l) => isRtl(l.code)).map((l) => l.code)).toEqual(["ar", "ur"]);
  });

  it("breaks Chinese and Japanese into words without spaces, and other languages at spaces", async () => {
    const { splitWords } = await import("@/components/onboarding/Guide");
    expect(splitWords("Hello there, friend.", "en")).toEqual({ words: ["Hello", "there,", "friend."], joiner: " " });
    const zh = splitWords("欢迎来到阅读。", "zh");
    expect(zh.joiner).toBe("");
    expect(zh.words.join("")).toBe("欢迎来到阅读。");
    expect(zh.words.length).toBeGreaterThan(1);
  });

  it("says reading time with the language's own unit names", async () => {
    const { formatReadingTime } = await import("@/lib/i18n/format");
    expect(formatReadingTime(140, "en")).toBe("140 minutes");
    expect(formatReadingTime(3650, "en")).toBe("60 hours");
    expect(formatReadingTime(3650, "es")).toBe("60 horas");
  });
});

describe("what you can do", () => {
  it("is written for every stage of every level the card can show", async () => {
    const { CEFR, LEVEL_FLOOR, levelFromXp } = await import("@/lib/xp/levels");
    const codes = new Set<string>();
    for (let xp = 0; xp <= LEVEL_FLOOR.C2 + 1000; xp += 250) codes.add(levelFromXp(xp).code);
    expect(codes.size).toBe(16);
    for (const code of codes) expect((EN as Record<string, string>)[`cando.${code}`], code).toBeTruthy();
    expect(CEFR).toHaveLength(6);
  });
});

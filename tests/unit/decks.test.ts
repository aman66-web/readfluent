import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { deckCardId, loadDeck, parseDeckCardId } from "@/lib/decks";

const read = (code: string) => JSON.parse(readFileSync(`lib/decks/data/${code}.json`, "utf8")) as { lang: string; phrases: { t: string; en: string; ph?: string }[] };

describe("phrase decks", () => {
  for (const { code } of LANGUAGES) {
    it(`${code}: 100 phrases, none empty, none repeated`, () => {
      const d = read(code);
      expect(d.lang).toBe(code);
      expect(d.phrases).toHaveLength(100);
      for (const p of d.phrases) {
        expect(p.t.trim()).not.toBe("");
        expect(p.en.trim()).not.toBe("");
      }
      expect(new Set(d.phrases.map((p) => p.t.trim().toLowerCase())).size).toBe(100);
    });
  }

  it("loads a deck by language and ignores a bad code", async () => {
    expect((await loadDeck("es")).length).toBe(100);
    expect(await loadDeck("../x")).toEqual([]);
    expect(await loadDeck("zz")).toEqual([]);
  });

  it("card ids round-trip", () => {
    expect(parseDeckCardId(deckCardId("es", 7))).toEqual({ lang: "es", index: 7 });
    expect(parseDeckCardId("es:hola")).toBeNull();
  });
});

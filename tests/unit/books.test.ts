import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkBook, type EnBook } from "../../scripts/books/check-en";
import { checkTranslation, type TrBook } from "../../scripts/books/check-translation";
import { PREVIEW_BOOKS, lengthsOf, pageCount } from "@/lib/preview/catalog";
import { LEVELS } from "@/lib/content/limits";
import { SPANISH_DICT } from "@/lib/preview/spanish";
import { tokenize } from "@/lib/reading/sentences";

const dir = (slug: string) => new URL(`../../lib/preview/books/${slug}/`, import.meta.url);
const read = <T,>(slug: string, file: string): T => JSON.parse(readFileSync(new URL(file, dir(slug)), "utf8")) as T;
const WRITTEN = PREVIEW_BOOKS.filter((b) => b.source === "file" && !b.generated);

describe("the hand-written books", () => {
  it("are four, each offered in the 50-page edition only, with no text in the app's own code", () => {
    expect(WRITTEN.map((b) => b.slug).sort()).toEqual([
      "alice-s-adventures-in-wonderland", "the-hound-of-the-baskervilles", "the-richest-man-in-babylon", "trees-talk-to-each-other",
    ]);
    for (const b of WRITTEN) {
      expect(lengthsOf(b), b.slug).toEqual([50]);
      for (const l of LEVELS) { expect(pageCount(b, l.id), b.slug).toBe(50); expect(b.text[l.id], b.slug).toEqual([]); }
    }
  });

  for (const b of WRITTEN) {
    describe(b.slug, () => {
      const en = read<EnBook>(b.slug, "en.json");

      it("is clean by the checker: 50 beats, 50 pages in each level, the right number of sentences, readable at its level", () => {
        const problems = checkBook(en);
        expect(problems.map((p) => `${p.where}: ${p.message}`)).toEqual([]);
      });

      it("has the jacket blurb the catalogue shows, and a first beat and a last", () => {
        expect(b.blurb).toBe(en.meta.blurb);
        expect(en.beats[0].n).toBe(1);
        expect(en.beats[49].n).toBe(50);
      });

      it("has a Spanish translation that matches it page for page, or none yet", () => {
        if (!existsSync(new URL("es.json", dir(b.slug)))) return;
        const es = read<TrBook>(b.slug, "es.json");
        expect(checkTranslation(en, es)).toEqual([]);
      });

      it("has a word card for every Spanish word of every page (the sample's own cards count)", () => {
        if (!existsSync(new URL("es.json", dir(b.slug)))) return;
        const es = read<TrBook>(b.slug, "es.json");
        const dict = JSON.parse(readFileSync(new URL("../dictionary.es.json", dir(b.slug)), "utf8")) as Record<string, { en: string; use: string }>;
        const sample = Object.keys(SPANISH_DICT);
        const missing = new Set<string>();
        for (const level of Object.values(es.levels)) for (const p of level) for (const t of tokenize(p.text)) if (t.word && !(t.word in dict) && !sample.includes(t.word)) missing.add(t.word);
        expect([...missing].slice(0, 20)).toEqual([]);
      });
    });
  }
});

describe("the level a book opens at", () => {
  it("follows the level picked at sign-up: A1 and A2 read at A1–A2, and so on", async () => {
    const { levelForCefr } = await import("@/lib/content/limits");
    expect(["A1", "A2", "B1", "B2", "C1", "C2"].map((c) => levelForCefr(c))).toEqual(["A1A2", "A1A2", "B1B2", "B1B2", "C1C2", "C1C2"]);
    expect(levelForCefr("A1.2")).toBe("A1A2");
    for (const none of [null, undefined, "", "Z9"]) expect(levelForCefr(none)).toBeNull();
  });
});

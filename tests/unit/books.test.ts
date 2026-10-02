import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkBook, type EnBook } from "../../scripts/books/check-en";
import { checkTranslation, type TrBook } from "../../scripts/books/check-translation";
import { PREVIEW_BOOKS, lengthsOf, pageCount } from "@/lib/preview/catalog";
import { LEVELS } from "@/lib/content/limits";

const dir = (slug: string) => new URL(`../../lib/preview/books/${slug}/`, import.meta.url);
const read = <T,>(slug: string, file: string): T => JSON.parse(readFileSync(new URL(file, dir(slug)), "utf8")) as T;
const WRITTEN = PREVIEW_BOOKS.filter((b) => b.source === "file");

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
    });
  }
});

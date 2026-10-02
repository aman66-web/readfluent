import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ART } from "@/components/welcome/art";
import { checkBook, type EnBook } from "../../scripts/books/check-en";
import { breakTitle, titleSize } from "../../scripts/books/build-catalog";
import GENERATED from "@/lib/preview/written.generated.json";
import type { GeneratedBook } from "@/lib/preview/generated";
import { CATEGORIES } from "@/lib/content/limits";

interface ListEntry { slug: string; title: string; category: string; type: string; done: boolean }
const LIST = JSON.parse(readFileSync("scripts/books/LIST.json", "utf8")) as ListEntry[];
const written = LIST.filter((e) => !e.done && existsSync(`lib/preview/books/${e.slug}/en.json`));
const DARK = ["#0B3B4A", "#1B2250", "#0E7490", "#123D2F", "#1C1C1F", "#2A1B5A", "#0A1428", "#164E63", "#3B1D4A", "#26262A", "#0F3B38", "#14407A"];
const LIGHT = ["#22D3EE", "#E3F8FC", "#F3EDE3", "#DDF3E4", "#D4F4FA"];

describe("the written library", () => {
  it("lists nine categories of thirty", () => {
    expect(LIST).toHaveLength(270);
    for (const c of CATEGORIES) expect(LIST.filter((e) => e.category === c.id), c.id).toHaveLength(30);
  });

  for (const e of written) {
    it(`${e.slug}: passes every rule of the brief and has a cover`, () => {
      const book = JSON.parse(readFileSync(`lib/preview/books/${e.slug}/en.json`, "utf8")) as EnBook;
      expect(book.slug).toBe(e.slug);
      expect(checkBook(book).map((p) => `${p.where}: ${p.message}`)).toEqual([]);
      if (e.category === "health") {
        expect(book.beats[49].summary + book.beats[49].scene, "beat 50").toBeTruthy();
        for (const level of Object.values(book.levels)) expect(level[49], "last page").toMatch(/not medical advice/i);
        expect(book.meta.bible).toMatch(/not medical advice/i);
      }
      const cover = JSON.parse(readFileSync(`lib/preview/books/${e.slug}/cover.json`, "utf8")) as { bg: string; light?: boolean; art: string[] };
      expect([...DARK, ...LIGHT], "cover colour").toContain(cover.bg);
      expect(cover.light === true, "light flag").toBe(LIGHT.includes(cover.bg));
      expect(cover.art.length).toBeGreaterThanOrEqual(1);
      for (const id of cover.art) expect(ART[id], `picture ${id}`).toBeTypeOf("function");
    });
  }

  it("has a catalogue record for each written book, with titles that fit the cover", () => {
    for (const g of GENERATED as GeneratedBook[]) {
      expect(g.cover.title.join(" ")).toBe(g.title);
      expect(g.blurb.length).toBeGreaterThan(30);
    }
  });
});

describe("cover titles", () => {
  it("break at word edges and shrink for long lines", () => {
    expect(breakTitle("The Hound of the Baskervilles")).toEqual(["The Hound of", "the", "Baskervilles"]);
    expect(breakTitle("Walden")).toEqual(["Walden"]);
    expect(titleSize(["Walden"])).toBe(19);
    expect(titleSize(["Baskervilles"])).toBeLessThan(15);
  });
});

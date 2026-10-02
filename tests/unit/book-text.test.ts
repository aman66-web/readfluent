import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN } from "@/lib/i18n/en";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { PREVIEW_BOOKS } from "@/lib/preview/catalog";

const dir = (slug: string) => `lib/preview/books/${slug}`;
const read = (p: string) => JSON.parse(readFileSync(p, "utf8")) as string[];

describe("every book speaks every language", () => {
  it("has a title and a description in the app's words for each book", () => {
    for (const b of PREVIEW_BOOKS) {
      expect(EN[`book.${b.slug}.title` as keyof typeof EN], b.slug).toBe(b.title);
      expect(EN[`book.${b.slug}.blurb` as keyof typeof EN], b.slug).toBe(b.blurb);
    }
  });

  for (const { code } of LANGUAGES) {
    it(`${code}: a chapter line for every moment of every book, same count as English`, () => {
      for (const b of PREVIEW_BOOKS) {
        const en = read(`${dir(b.slug)}/outline.en.json`);
        const p = `${dir(b.slug)}/outline.${code}.json`;
        expect(existsSync(p), p).toBe(true);
        const lines = read(p);
        expect(lines.length, p).toBe(en.length);
        for (const l of lines) expect(l.trim(), p).not.toBe("");
      }
    });
  }
});

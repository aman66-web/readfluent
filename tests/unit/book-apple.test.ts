import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { tokenize } from "@/lib/reading/sentences";

/** Whole books translated ahead of time on a Mac (<slug>/<lang>.apple.json): each must match its book, page for page. */
const ROOT = path.join(process.cwd(), "lib/preview/books");
const FILES = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => fs.readdirSync(path.join(ROOT, d.name)).filter((f) => f.endsWith(".apple.json")).map((f) => ({ slug: d.name, file: f, lang: f.split(".")[0] })));
const LEVELS = ["A1A2", "B1B2", "C1C2"] as const;

describe("books translated ahead of time", () => {
  it("(there may be none yet)", () => expect(Array.isArray(FILES)).toBe(true));
  for (const { slug, file, lang } of FILES) {
    it(`${slug}/${file} matches its book page for page`, () => {
      const t = JSON.parse(fs.readFileSync(path.join(ROOT, slug, file), "utf8"));
      const en = JSON.parse(fs.readFileSync(path.join(ROOT, slug, "en.json"), "utf8"));
      expect(t.slug).toBe(slug);
      expect(t.lang).toBe(lang);
      for (const lv of LEVELS) {
        expect(t.levels[lv], lv).toHaveLength(en.levels[lv].length);
        const same = t.levels[lv].filter((x: string, i: number) => x.trim() === en.levels[lv][i].trim()).length;
        expect(same, `${lv}: pages still in English`).toBeLessThan(en.levels[lv].length * 0.1);
        for (const x of t.levels[lv]) expect(typeof x === "string" && x.trim().length > 0).toBe(true);
      }
      // Every card is a lowercase word of the text with a non-empty English meaning.
      const words = new Set(LEVELS.flatMap((lv) => t.levels[lv].flatMap((x: string) => tokenize(x).flatMap((k) => (k.word ? [k.word] : [])))));
      for (const [w, meaning] of Object.entries(t.dict as Record<string, string>)) {
        expect(w).toBe(w.toLowerCase());
        expect(words.has(w), `card "${w}" is not in the text`).toBe(true);
        expect(typeof meaning === "string" && meaning.trim().length > 0, `card "${w}"`).toBe(true);
      }
    });
  }
});

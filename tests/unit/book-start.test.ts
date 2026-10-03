import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { tokenize } from "@/lib/reading/sentences";
import { loadStart } from "@/lib/preview/books/load";

/** The first chapters translated ahead of time (lib/preview/books/<slug>/<lang>.start.json): each one must match its book. */
const ROOT = path.join(process.cwd(), "lib/preview/books");
const FILES = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => fs.readdirSync(path.join(ROOT, d.name)).filter((f) => f.endsWith(".start.json")).map((f) => ({ slug: d.name, file: f, lang: f.split(".")[0] })));

const LEVEL_IDS = ["A1A2", "B1B2", "C1C2"] as const;
const words = (text: string) => new Set(tokenize(text).flatMap((t) => (t.word ? [t.word] : [])));

describe("first chapters translated ahead of time", () => {
  it("are only for languages other than English", () => {
    for (const f of FILES) expect(f.lang, f.file).not.toBe("en");
  });

  for (const { slug, file, lang } of FILES) {
    it(`${slug}/${file} matches its book page for page`, () => {
      const start = JSON.parse(fs.readFileSync(path.join(ROOT, slug, file), "utf8"));
      const en = JSON.parse(fs.readFileSync(path.join(ROOT, slug, "en.json"), "utf8"));
      expect(start.slug).toBe(slug);
      expect(start.lang).toBe(lang);
      for (const lv of LEVEL_IDS) {
        const pages = start.levels[lv];
        expect(pages.length, lv).toBeGreaterThan(0);
        expect(pages.length, lv).toBeLessThanOrEqual(en.levels[lv].length);
        pages.forEach((p: { text: string; keys: { w: string; en: string }[] }, i: number) => {
          expect(p.text.trim(), `${lv} ${i + 1}`).not.toBe(en.levels[lv][i].trim());
          const ws = words(p.text);
          for (const k of p.keys) {
            expect(ws.has(k.w.toLowerCase()), `${lv} ${i + 1} key "${k.w}"`).toBe(true);
            expect(start.dict[k.w.toLowerCase()], `${lv} ${i + 1} card for "${k.w}"`).toBeTruthy();
          }
        });
      }
      for (const [w, e] of Object.entries(start.dict as Record<string, { en: string; use: string }>)) {
        expect(w, "card keys are lowercase").toBe(w.toLowerCase());
        expect(e.en && e.use, w).toBeTruthy();
      }
    });
  }

  it("load by book and language, and only for a real slug and language", async () => {
    expect(await loadStart("../etc", "es")).toBeNull();
    expect(await loadStart("persuasion", "en")).toBeNull();
    expect(await loadStart("no-such-book", "es")).toBeNull();
    const first = FILES[0];
    if (first) expect((await loadStart(first.slug, first.lang))?.slug).toBe(first.slug);
  });
});

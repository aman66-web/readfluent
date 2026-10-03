import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { PREVIEW_BOOKS } from "@/lib/preview/catalog";

type Meta = Record<string, { t: string; b: string; c: string[] }>;

/** Every hand-built book with named chapters has a same-length list of names in every language. */
describe("hand-built books: chapter names in every language", () => {
  for (const { code } of LANGUAGES) {
    if (code === "en") continue;
    it(`${code}`, () => {
      const meta = JSON.parse(readFileSync(`lib/preview/books-i18n/${code}.json`, "utf8")) as Meta;
      for (const b of PREVIEW_BOOKS.filter((x) => !x.generated)) {
        const f = `lib/preview/books/${b.slug}/en.json`;
        if (!existsSync(f)) continue;
        const en = (JSON.parse(readFileSync(f, "utf8")).meta?.chapters ?? []) as unknown[];
        if (!en.length) continue;
        const c = meta[b.slug]?.c;
        expect(c?.length, `${code} ${b.slug}`).toBe(en.length);
        for (const n of c) expect(n.trim(), `${code} ${b.slug}`).not.toBe("");
      }
    });
  }
});

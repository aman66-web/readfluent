import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ART_IDS } from "@/components/ObjectPhoto";
import { LEVELS } from "@/lib/content/limits";
import { SPANISH_DICT, SPANISH_PAGES } from "@/lib/preview/spanish";
import { sentenceAt, sentenceRanges, tokenize, translatedLine } from "@/lib/reading/sentences";
import { parseSaved, savedId } from "@/lib/words/saved";

describe("the words of a text", () => {
  it("splits it into words and the gaps between them, losing nothing", () => {
    const text = 'Elizabeth oyó a Darcy decir: "Ella no es bastante guapa para mí."';
    const toks = tokenize(text);
    expect(toks.map((t) => t.text).join("")).toBe(text);
    expect(toks.filter((t) => t.word).map((t) => t.word)).toContain("oyó");
    expect(toks.filter((t) => t.word).map((t) => t.word)).toContain("mí");
    for (const t of toks) expect(text.slice(t.start, t.start + t.text.length)).toBe(t.text);
  });

  it("finds the sentence a word is in, and the same sentence of the translation", () => {
    const es = "El señor Darcy era rico. Elizabeth oyó cada palabra.";
    const en = "Mr Darcy was rich. Elizabeth heard every word.";
    expect(sentenceRanges(es)).toHaveLength(2);
    expect(sentenceAt(sentenceRanges(es), es.indexOf("oyó"))).toBe(1);
    expect(translatedLine(es, en, es.indexOf("rico"))).toBe("Mr Darcy was rich.");
    expect(translatedLine(es, en, es.indexOf("oyó"))).toBe("Elizabeth heard every word.");
    // A translation with fewer sentences falls back to its last.
    expect(translatedLine(es, "It all happened.", es.indexOf("oyó"))).toBe("It all happened.");
  });
});

describe("the Spanish sample (the owner's template)", () => {
  it("has five pages at every level, each with a photo that exists", () => {
    expect(SPANISH_PAGES).toHaveLength(5);
    for (const p of SPANISH_PAGES) {
      expect(ART_IDS).toContain(p.art);
      for (const l of LEVELS) expect(p.text[l.id].text.length, `${p.art} ${l.id}`).toBeGreaterThan(20);
    }
  });

  it("matches every key word in its text and its translation, and has a word card for it", () => {
    for (const p of SPANISH_PAGES) for (const l of LEVELS) {
      const x = p.text[l.id];
      const words = tokenize(x.text).flatMap((t) => (t.word ? [t.word] : []));
      const en = tokenize(x.translation).flatMap((t) => (t.word ? [t.word] : []));
      expect(x.keys.length).toBe(3);
      for (const k of x.keys) {
        expect(words, `${p.art} ${l.id}: ${k.w}`).toContain(k.w);
        expect(en, `${p.art} ${l.id}: ${k.en}`).toContain(k.en.toLowerCase());
        expect(SPANISH_DICT[k.w], k.w).toBeDefined();
      }
    }
  });

  it("is written sentence for sentence, so a tapped word finds its line", () => {
    for (const p of SPANISH_PAGES) for (const l of LEVELS) {
      const x = p.text[l.id];
      expect(sentenceRanges(x.translation).length, `${p.art} ${l.id}`).toBe(sentenceRanges(x.text).length);
    }
  });
});

describe("saved words", () => {
  it("keys a word by language, so one spelling in two languages stays two", () => {
    expect(savedId("es", "Pie")).toBe("es:pie");
    expect(savedId("fr", "pie")).not.toBe(savedId("es", "pie"));
  });

  it("reads back what was saved and never throws on anything else", () => {
    const ok = { "es:baile": { word: "baile", lang: "es", meaning: "dance", book: "Pride and Prejudice", at: 1 } };
    expect(parseSaved(JSON.stringify(ok))).toEqual(ok);
    for (const bad of ["", "nope", "[]", "null", '{"a":1}', '{"es:x":{"word":1}}']) expect(parseSaved(bad), bad).toEqual({});
  });
});

vi.mock("next/link", () => ({ default: (p: { href: string; children?: unknown }) => createElement("a", { href: p.href }, p.children as never) }));

describe("the reader", () => {
  const book = { slug: "pride-and-prejudice", title: "Pride and Prejudice", levelId: "A1A2", levelLabel: "A1–A2", length: 50, hue: 345, scenes: [{ n: 1, caption: "A" }] };
  it("shows a Spanish page with its matched words underlined and nothing open", async () => {
    const { Reader } = await import("@/components/Reader");
    const x = SPANISH_PAGES[0].text.A1A2;
    const html = renderToStaticMarkup(createElement(Reader, {
      ...book,
      variants: [{ lang: "es", dict: SPANISH_DICT, pages: [{ n: 1, text: x.text, scene: 1, target: { translation: x.translation, keys: x.keys, art: SPANISH_PAGES[0].art, bg: SPANISH_PAGES[0].bg } }] }],
    }));
    expect((html.match(/key-word/g) ?? []).length).toBe(3);
    expect(html).toContain('data-w="orgulloso"');
    expect(html).toContain("Tap any word to see what it means");
    expect(html).not.toContain('role="dialog"');
  });

  it("is plain reading where a version has no word cards", async () => {
    const { Reader } = await import("@/components/Reader");
    const html = renderToStaticMarkup(createElement(Reader, { ...book, variants: [{ lang: "en", pages: [{ n: 1, text: "Hello there.", scene: 1 }] }] }));
    expect(html).toContain("Hello there.");
    expect(html).not.toContain("data-w=");
    expect(html).not.toContain("Tap any word");
  });
});

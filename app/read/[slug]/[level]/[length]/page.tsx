import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { LENGTHS, LEVELS, levelBySlug } from "@/lib/content/limits";
import type { ReaderVariant } from "@/components/reader/types";
import { findBook, lengthsOf, pagesOf, PREVIEW_BOOKS, type Scene } from "@/lib/preview/catalog";
import { loadDictionary, loadEnglish, loadTranslation } from "@/lib/preview/books/load";
import { SPANISH_DICT, SPANISH_LANG, SPANISH_PAGES } from "@/lib/preview/spanish";
import { tokenize } from "@/lib/reading/sentences";

export function generateStaticParams() {
  // The hand-built books are made at build time; the rest of the library is built the first time somebody opens it, then kept.
  return PREVIEW_BOOKS.filter((b) => !b.generated).flatMap((b) =>
    LEVELS.flatMap((l) => lengthsOf(b).map((n) => ({ slug: b.slug, level: l.slug, length: String(n) }))),
  );
}

/** The languages a hand-written book may have a translation in. Each is a file next to the English (lib/preview/books/<slug>/<code>.json). */
const TRANSLATIONS = ["es"] as const;

/** One version of one book: /read/<book>/<a1a2|b1b2|c1c2>/<50|100|200>. */
export default async function ReadPage({ params }: { params: Promise<{ slug: string; level: string; length: string }> }) {
  const { slug, level, length } = await params;
  const book = findBook(slug);
  const lv = levelBySlug(level);
  const len = LENGTHS.find((l) => String(l.pages) === length);
  if (!book || !lv || !len || !lengthsOf(book).includes(len.pages)) notFound();

  let variants: ReaderVariant[];
  let scenes: Scene[] = book.scenes;

  if (book.source === "file") {
    // A hand-written book: the English is the book, and every other language is a translation of it, page for page.
    const en = await loadEnglish(slug);
    if (!en) notFound();
    scenes = en.beats.map((b) => ({ n: b.n, caption: b.scene }));
    const english = en.levels[lv.id];
    variants = [{ lang: "en", pages: english.map((text, i) => ({ n: i + 1, text, scene: i + 1 })) }];
    for (const lang of TRANSLATIONS) {
      const tr = await loadTranslation(slug, lang);
      const pages = tr?.levels[lv.id];
      if (!pages || pages.length !== english.length) continue;
      const words = new Set(pages.flatMap((p) => tokenize(p.text).flatMap((t) => (t.word ? [t.word] : []))));
      const dict = await loadDictionary(lang, words);
      // The sample's own cards cover some of the same words.
      if (lang === SPANISH_LANG) for (const w of words) if (!(w in dict) && w in SPANISH_DICT) dict[w] = SPANISH_DICT[w];
      // A translation is offered once nearly every word in it has a card: a tap that says "no meaning" is worse than reading in English.
      if (Object.keys(dict).length < words.size * 0.9) continue;
      variants.push({
        lang,
        dict,
        pages: pages.map((p, i) => ({ n: i + 1, text: p.text, scene: i + 1, target: { translation: english[i], keys: p.keys } })),
      });
    }
  } else {
    // The preview sample, and (for this book only) the template's five Spanish pages with word cards.
    variants = [{ lang: "en", pages: pagesOf(book, lv.id) }];
    if (book.slug === "pride-and-prejudice") {
      variants.push({
        lang: SPANISH_LANG,
        dict: SPANISH_DICT,
        pages: SPANISH_PAGES.map((p, i) => {
          const x = p.text[lv.id];
          return { n: i + 1, text: x.text, scene: i + 4, target: { translation: x.translation, keys: x.keys, art: p.art, bg: p.bg } };
        }),
      });
    }
  }

  return (
    <Reader
      slug={book.slug}
      title={book.title}
      levelId={lv.id}
      levelLabel={lv.label}
      length={len.pages}
      variants={variants}
      scenes={scenes}
      translatable={book.source === "file"}
    />
  );
}

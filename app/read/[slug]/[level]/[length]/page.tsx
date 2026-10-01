import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { categoryById, LENGTHS, LEVELS, levelBySlug } from "@/lib/content/limits";
import type { ReaderVariant } from "@/components/reader/types";
import { findBook, pagesOf, PREVIEW_BOOKS } from "@/lib/preview/catalog";
import { SPANISH_DICT, SPANISH_LANG, SPANISH_PAGES } from "@/lib/preview/spanish";

export function generateStaticParams() {
  return PREVIEW_BOOKS.flatMap((b) =>
    LEVELS.flatMap((l) => LENGTHS.map((n) => ({ slug: b.slug, level: l.slug, length: String(n.pages) }))),
  );
}

/** One version of one book: /read/<book>/<a1a2|b1b2|c1c2>/<50|100|200>. */
export default async function ReadPage({ params }: { params: Promise<{ slug: string; level: string; length: string }> }) {
  const { slug, level, length } = await params;
  const book = findBook(slug);
  const lv = levelBySlug(level);
  const len = LENGTHS.find((l) => String(l.pages) === length);
  if (!book || !lv || !len) notFound();

  // The book as written for the preview, and (for this book only) the template's five Spanish pages with word cards.
  const variants: ReaderVariant[] = [{ lang: "en", pages: pagesOf(book, lv.id) }];
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

  return (
    <Reader
      slug={book.slug}
      title={book.title}
      levelId={lv.id}
      levelLabel={lv.label}
      length={len.pages}
      hue={categoryById(book.category)?.hue ?? 30}
      variants={variants}
      scenes={book.scenes}
    />
  );
}

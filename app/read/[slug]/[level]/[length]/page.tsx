import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { categoryById, LENGTHS, LEVELS, levelBySlug } from "@/lib/content/limits";
import { findBook, pagesOf, PREVIEW_BOOKS } from "@/lib/preview/catalog";

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

  return (
    <Reader
      slug={book.slug}
      title={book.title}
      levelId={lv.id}
      levelLabel={lv.label}
      length={len.pages}
      hue={categoryById(book.category)?.hue ?? 30}
      pages={pagesOf(book, lv.id)}
      scenes={book.scenes}
    />
  );
}

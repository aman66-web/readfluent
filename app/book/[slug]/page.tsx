import { notFound } from "next/navigation";
import { BookView } from "@/components/book/BookView";
import { findBook, PREVIEW_BOOKS } from "@/lib/preview/catalog";
import { readableLanguages } from "@/lib/preview/books/available";
import { loadEnglish } from "@/lib/preview/books/load";

export function generateStaticParams() {
  return PREVIEW_BOOKS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const book = findBook((await params).slug);
  return { title: book ? `${book.title} · ReadFluent` : "ReadFluent" };
}

/** A book's jacket (components/book/BookView.tsx): the interface is in the reader's language, the book's own words are not. */
export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = findBook(slug);
  if (!book) notFound();
  // The book's moments, in order: a hand-written book's outline, or the sample's scenes. One line each, never the pages themselves.
  const en = book.source === "file" ? await loadEnglish(slug) : null;
  const outline = en ? en.beats.map((b) => ({ n: b.n, text: b.summary })) : book.scenes.map((s) => ({ n: s.n, text: s.caption }));
  const langs = await readableLanguages(slug, book.source);
  return <BookView book={book} outline={outline} langs={langs} chapterNames={en?.meta.chapters} />;
}

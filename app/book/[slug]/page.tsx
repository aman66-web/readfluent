import { notFound } from "next/navigation";
import { BookView } from "@/components/book/BookView";
import { findBook, PREVIEW_BOOKS } from "@/lib/preview/catalog";

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
  return <BookView book={book} />;
}

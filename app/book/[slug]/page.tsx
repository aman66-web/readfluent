import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { ReadSheet } from "@/components/library/ReadSheet";
import { categoryById, LENGTHS, LEVELS } from "@/lib/content/limits";
import { findBook, PREVIEW_BOOKS } from "@/lib/preview/catalog";

export function generateStaticParams() {
  return PREVIEW_BOOKS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const book = findBook((await params).slug);
  return { title: book ? `${book.title} · ReadFluent` : "ReadFluent" };
}

/** A book's jacket: who wrote it, what it is, and the Read button that starts the level and length choice. */
export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = findBook(slug);
  if (!book) notFound();
  const category = categoryById(book.category);

  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 pb-6 pt-2">
      <Link href="/" aria-label="Back to the library" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </Link>

      <div className="mt-2 flex gap-5">
        <BookCover title={book.title} author={book.author} hue={category?.hue ?? 30} className="w-[132px] shrink-0" />
        <div className="min-w-0 self-end pb-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">{category?.label}</p>
          <h1 className="mt-1 text-[24px] font-bold leading-[1.15] tracking-[-0.015em]">{book.title}</h1>
          <p className="mt-1 text-[14px] text-muted">{book.kind === "classic" ? `by ${book.author}` : `Inspired by ${book.author}`}</p>
        </div>
      </div>

      <p className="font-reading mt-6 text-[18px] leading-[1.55]">{book.blurb}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-xl border border-border bg-surface p-3">
          <dt className="font-semibold text-faint">Levels</dt>
          <dd className="mt-0.5 font-semibold">{LEVELS.map((l) => l.label).join(" · ")}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <dt className="font-semibold text-faint">Lengths</dt>
          <dd className="mt-0.5 font-semibold">{LENGTHS.map((l) => l.pages).join(" · ")} pages</dd>
        </div>
      </dl>

      <div className="mt-auto pt-8">
        <ReadSheet slug={book.slug} title={book.title} />
        <p className="mt-3 text-center text-[12px] text-faint">9 versions of this book: 3 levels × 3 lengths</p>
      </div>
    </main>
  );
}

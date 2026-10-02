"use client";

import { BackLink } from "@/components/BackLink";
import { BookCover } from "@/components/BookCover";
import { ReadPicker } from "@/components/book/ReadPicker";
import { categoryById } from "@/lib/content/limits";
import { useT } from "@/lib/i18n/react";
import { coverAuthor, lengthsOf, type PreviewBook } from "@/lib/preview/catalog";

/** A book's jacket: who wrote it, what it is, its level and length (already chosen, one tap to change) and the Read button. The book's own words stay as they are; the interface around them follows the reader's language. */
export function BookView({ book }: { book: PreviewBook }) {
  const t = useT();
  const category = categoryById(book.category);
  const lengths = lengthsOf(book);
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:7rem] [--pt:.5rem]">
      <BackLink fallback="/library" label={t("book.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </BackLink>

      <div className="mt-2 flex gap-5">
        <BookCover title={book.title} author={coverAuthor(book)} hue={category?.hue ?? 30} className="w-[132px] shrink-0" />
        <div className="min-w-0 self-end pb-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">{category ? t(`cat.${category.id}`) : ""}</p>
          <h1 lang="en" className="mt-1 text-[24px] font-bold leading-[1.15] tracking-[-0.015em]" dir="auto">{book.title}</h1>
          <p className="mt-1 text-[14px] text-muted">{book.kind === "classic" ? t("book.by", { author: book.author }) : t("book.inspired", { author: book.author })}</p>
        </div>
      </div>

      <p lang="en" dir="ltr" className="font-reading mt-6 text-[18px] leading-[1.55]">{book.blurb}</p>

      <ReadPicker slug={book.slug} lengths={lengths} />

    </main>
  );
}

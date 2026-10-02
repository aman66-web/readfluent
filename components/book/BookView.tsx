"use client";

import { BackLink } from "@/components/BackLink";
import { BookCover } from "@/components/BookCover";
import { ReadPicker } from "@/components/book/ReadPicker";
import { COVERS } from "@/components/welcome/covers";
import { categoryById } from "@/lib/content/limits";
import { useT } from "@/lib/i18n/react";
import { coverAuthor, lengthsOf, type PreviewBook } from "@/lib/preview/catalog";

/**
 * A book's jacket: the cover large over a wash of its own colour, who wrote it and what it is, the
 * level and length (already chosen, one tap to change) and the Read button. The book's own words stay
 * as they are; the interface around them follows the reader's language.
 */
export function BookView({ book }: { book: PreviewBook }) {
  const t = useT();
  const category = categoryById(book.category);
  const lengths = lengthsOf(book);
  // The wash behind the cover: the cover's own ground where it is dark, the brand's cyan where it is light.
  const cover = COVERS[book.slug];
  const wash = cover && !cover.light ? cover.bg : "#0E7490";
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:7rem] [--pt:.5rem]">
      <div className="relative -mx-5 px-5 pb-5" style={{ background: `radial-gradient(130% 80% at 50% 0%, ${wash}59 0%, ${wash}1f 45%, transparent 75%)` }}>
        <BackLink fallback="/library" label={t("book.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
        </BackLink>

        <div className="bk-float mx-auto mt-1 w-[min(42vw,170px)]">
          <BookCover slug={book.slug} title={book.title} author={coverAuthor(book)} hue={category?.hue ?? 30} className="drop-shadow-[0_22px_28px_rgba(8,47,60,.38)]" />
        </div>

        <div className="mt-5 text-center">
          <p className="inline-flex h-7 items-center rounded-full bg-accent-bright/20 px-3 text-[11.5px] font-bold uppercase tracking-[0.12em] text-accent">{category ? t(`cat.${category.id}`) : ""}</p>
          <h1 lang="en" className="font-reading mt-2.5 text-[28px] font-bold leading-[1.1] tracking-[-0.015em]" dir="auto">{book.title}</h1>
          <p className="mt-1.5 text-[14px] text-muted">{book.kind === "classic" ? t("book.by", { author: book.author }) : t("book.inspired", { author: book.author })}</p>
        </div>
      </div>

      <ReadPicker slug={book.slug} lengths={lengths}>
        <p lang="en" dir="ltr" className="font-reading mt-6 text-[17.5px] leading-[1.6] text-foreground/90">{book.blurb}</p>
      </ReadPicker>
    </main>
  );
}

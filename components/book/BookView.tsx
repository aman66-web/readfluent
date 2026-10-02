"use client";

import { BackLink } from "@/components/BackLink";
import { BookCover } from "@/components/BookCover";
import type { OutlineItem } from "@/components/book/Pathway";
import { ReadPicker } from "@/components/book/ReadPicker";
import { COVERS } from "@/components/welcome/covers";
import { categoryById } from "@/lib/content/limits";
import { useBookText, useLocale, useT } from "@/lib/i18n/react";
import { coverAuthor, lengthsOf, type PreviewBook } from "@/lib/preview/catalog";

/**
 * A book's jacket: the cover large and turned a little towards you over a wash of its own colour, who wrote
 * it and what kind of book it is, then (ReadPicker) how big it is, where the reader has got to, what it is
 * about, the level and length, the path through it and the way in. The words around the book follow the
 * reader's language: its name and description too, where there is a translation; the book's own pages stay
 * as they are.
 */
export function BookView({ book, outline }: { book: PreviewBook; /** The book's moments, in order, for the path. */ outline: readonly OutlineItem[] }) {
  const t = useT();
  const locale = useLocale();
  const text = useBookText();
  const category = categoryById(book.category);
  const lengths = lengthsOf(book);
  const title = text(book.slug, "title", book.title);
  const blurb = text(book.slug, "blurb", book.blurb);
  // The wash behind the cover: the cover's own ground where it is dark, the brand's cyan where it is light.
  const cover = COVERS[book.slug];
  const wash = cover && !cover.light ? cover.bg : "#0E7490";
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:7rem] [--pt:.5rem]">
      <div className="relative -mx-5 overflow-hidden px-5 pb-6"
           style={{ background: `radial-gradient(120% 70% at 50% 0%, ${wash}80 0%, ${wash}33 45%, transparent 78%), linear-gradient(180deg, transparent 70%, var(--background))` }}>
        {/* Soft lights drifting behind the cover. */}
        <span aria-hidden className="pointer-events-none absolute -start-10 top-24 size-40 rounded-full bg-accent-bright/25 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -end-12 top-44 size-44 rounded-full blur-3xl" style={{ background: `${wash}40` }} />

        <BackLink fallback="/library" label={t("book.back")} className="relative -ms-2 flex size-11 items-center justify-center rounded-full bg-background/60 backdrop-blur active:bg-border/60">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
        </BackLink>

        <div className="relative mx-auto mt-2 w-[min(46vw,184px)] [perspective:900px]">
          <div className="bk-float">
            <div className="[transform:rotateY(-16deg)_rotateX(3deg)] [transform-style:preserve-3d]">
              <BookCover slug={book.slug} title={title} author={coverAuthor(book)} hue={category?.hue ?? 30} className="drop-shadow-[0_30px_26px_rgba(8,47,60,.45)]" />
            </div>
          </div>
          {/* The shadow it casts on the floor. */}
          <span aria-hidden className="mx-auto mt-3 block h-3 w-4/5 rounded-[50%] bg-black/25 blur-md" />
        </div>

        <div className="relative mt-5 text-center">
          <p className="inline-flex h-7 items-center rounded-full bg-accent px-3.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-white">{category ? t(`cat.${category.id}`) : ""}</p>
          <h1 lang={locale} className="font-reading mt-3 text-[30px] font-bold leading-[1.08] tracking-[-0.02em]" dir="auto">{title}</h1>
          <p className="mt-1.5 text-[14.5px] text-muted">{book.kind === "classic" ? t("book.by", { author: book.author }) : t("book.inspired", { author: book.author })}</p>
        </div>
      </div>

      <ReadPicker slug={book.slug} lengths={lengths} outline={outline}>
        <p lang={locale} dir="auto" className="font-reading text-[17px] leading-[1.6] text-foreground/90">{blurb}</p>
        {/* Where it comes from, in the description where readers can see it. */}
        <p className="mt-3 border-t border-border pt-3 text-[13px] leading-snug text-muted">
          {book.kind === "classic" ? t("book.publicDomain") : <><span className="font-semibold text-foreground/80">{t("book.inspired", { author: book.author })}.</span> {t("book.notAffiliated")}</>}
        </p>
      </ReadPicker>
    </main>
  );
}

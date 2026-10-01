"use client";

import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { ReadSheet } from "@/components/library/ReadSheet";
import { LENGTHS, LEVELS, categoryById } from "@/lib/content/limits";
import { useT } from "@/lib/i18n/react";
import type { PreviewBook } from "@/lib/preview/catalog";

/** A book's jacket: who wrote it, what it is, and the Read button that starts the level and length choice. The book's own words stay as they are; the interface around them follows the reader's language. */
export function BookView({ book }: { book: PreviewBook }) {
  const t = useT();
  const category = categoryById(book.category);
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 pb-28 pt-2">
      <Link href="/" aria-label={t("book.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </Link>

      <div className="mt-2 flex gap-5">
        <BookCover title={book.title} author={book.author} hue={category?.hue ?? 30} className="w-[132px] shrink-0" />
        <div className="min-w-0 self-end pb-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">{category ? t(`cat.${category.id}`) : ""}</p>
          <h1 className="mt-1 text-[24px] font-bold leading-[1.15] tracking-[-0.015em]" dir="auto">{book.title}</h1>
          <p className="mt-1 text-[14px] text-muted">{book.kind === "classic" ? t("book.by", { author: book.author }) : t("book.inspired", { author: book.author })}</p>
        </div>
      </div>

      <p dir="ltr" className="font-reading mt-6 text-[18px] leading-[1.55]">{book.blurb}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-xl border border-border bg-surface p-3">
          <dt className="font-semibold text-faint">{t("book.levels")}</dt>
          <dd className="mt-0.5 font-semibold">{LEVELS.map((l) => l.label).join(" · ")}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <dt className="font-semibold text-faint">{t("book.lengths")}</dt>
          <dd className="mt-0.5 font-semibold">{t("book.pages", { list: LENGTHS.map((l) => l.pages).join(" · ") })}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-8">
        <ReadSheet slug={book.slug} title={book.title} />
        <p className="mt-3 text-center text-[12px] text-faint">{t("book.versions")}</p>
      </div>
    </main>
  );
}

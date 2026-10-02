"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { BookCover } from "@/components/BookCover";
import { categoryById } from "@/lib/content/limits";
import { useBookText, useT } from "@/lib/i18n/react";
import { coverAuthor, type PreviewBook } from "@/lib/preview/catalog";
import { PROGRESS_KEY, furthest, parseProgress } from "@/lib/progress";
import { readRaw, subscribeTo } from "@/lib/store/local";

const subProgress = subscribeTo(PROGRESS_KEY);
const server = () => "";

/** The book opened most recently that is not finished, and how far through it is. The last key written is the book opened last (savePage moves it to the end). */
function pickCarryOn(raw: string, books: PreviewBook[]): { book: PreviewBook; share: number; page: number; total: number } | null {
  const all = parseProgress(raw);
  for (const k of Object.keys(all).reverse()) {
    const slug = k.split("/")[0];
    const book = books.find((b) => b.slug === slug);
    const f = book ? furthest(all, slug) : null;
    if (book && f && f.index + 1 < f.length) return { book, share: (f.index + 1) / f.length, page: f.index + 1, total: f.length };
  }
  return null;
}

/** The book to carry on with, big: the one opened most recently that is not finished. */
export function CarryOn({ books }: { books: PreviewBook[] }) {
  const t = useT();
  const text = useBookText();
  const raw = useSyncExternalStore(subProgress, () => readRaw(PROGRESS_KEY), server);
  const pick = useMemo(() => pickCarryOn(raw, books), [raw, books]);
  if (!pick) return null;
  const { book, share, page, total } = pick;
  return (
    <Link href={`/book/${book.slug}`} className="relative mt-5 flex items-center gap-4 overflow-hidden rounded-[26px] bg-accent p-4 text-white shadow-[0_18px_30px_-18px_rgba(8,47,60,.7)] active:opacity-90">
      <span aria-hidden className="pointer-events-none absolute -end-8 -top-10 size-40 rounded-full bg-accent-bright/30 blur-2xl" />
      <BookCover slug={book.slug} title={text(book.slug, "title", book.title)} author={coverAuthor(book)} hue={categoryById(book.category)?.hue ?? 30} className="relative w-[64px] shrink-0 drop-shadow-[0_8px_10px_rgba(0,0,0,.35)]" />
      <span className="relative min-w-0 flex-1">
        <span className="block text-[11.5px] font-bold uppercase tracking-[0.1em] text-white/75">{t("home.carryOn")}</span>
        <span className="mt-0.5 line-clamp-2 block text-[18px] font-bold leading-tight" dir="auto">{text(book.slug, "title", book.title)}</span>
        <span className="mt-2.5 flex items-center gap-2.5" dir="ltr">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full bg-white" style={{ width: `${Math.max(5, share * 100)}%` }} /></span>
          <span className="tabular text-[12px] font-bold text-white/90">{page}/{total}</span>
        </span>
      </span>
    </Link>
  );
}


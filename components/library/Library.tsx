"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { CATEGORIES, categoryById, type CategoryId } from "@/lib/content/limits";
import { formatDate } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { coverAuthor, type PreviewBook } from "@/lib/preview/catalog";

/** A cover, as a link to the book, with its name, the day it joined, and the first lines of what it is about (the rest is on its page). */
function Cover({ book, className = "", caption = true }: { book: PreviewBook; className?: string; caption?: boolean }) {
  const t = useT();
  const locale = useLocale();
  return (
    <Link href={`/book/${book.slug}`} className={`block transition-transform active:scale-[0.98] ${className}`}>
      <BookCover slug={book.slug} title={book.title} author={coverAuthor(book)} hue={categoryById(book.category)?.hue ?? 30} />
      {caption && (
        <span className="mt-2.5 block">
          <span lang="en" className="block text-[14px] font-semibold leading-tight">{book.title}</span>
          <span className="mt-0.5 block text-[11.5px] text-faint">{t("library.added", { date: formatDate(new Date(`${book.added}T12:00:00`), locale) })}</span>
          <span lang="en" className="mt-1 line-clamp-2 block text-[12px] leading-snug text-muted">{book.blurb}</span>
        </span>
      )}
    </Link>
  );
}

/** Where a book will be: the same shape as a cover, dashed, saying more is coming. */
function SoonTile({ label, className = "" }: { label?: string; className?: string }) {
  const t = useT();
  return (
    <div className={`flex aspect-[2/3] flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-accent-bright/35 bg-accent-bright/[0.05] px-3 text-center ${className}`}>
      {label && <span className="text-[13px] font-semibold text-muted">{label}</span>}
      <span className={label ? "mt-1 text-[12px] text-faint" : "text-[13px] font-semibold text-faint"}>{t("library.soon")}</span>
    </div>
  );
}

/**
 * The library as shelves, one row for each kind of book, sliding sideways: the shelves the reader said
 * they were curious about first, then the rest, and under them the kinds still to come. The chips
 * above narrow it to one shelf, shown as a grid.
 */
export function Library({ books }: { books: PreviewBook[] }) {
  const t = useT();
  const { interests } = useAnswers();
  const [category, setCategory] = useState<CategoryId | "all">("all");

  const shelves = useMemo(() => {
    const withBooks = CATEGORIES.map((c) => ({ id: c.id, books: books.filter((b) => b.category === c.id) })).filter((s) => s.books.length > 0);
    // The ones they picked come first, in the order the shelves are always in.
    return [...withBooks.filter((s) => interests.includes(s.id)), ...withBooks.filter((s) => !interests.includes(s.id))];
  }, [books, interests]);
  const empty = CATEGORIES.filter((c) => !books.some((b) => b.category === c.id)).map((c) => c.id);

  const chips = [{ id: "all" as const }, ...CATEGORIES];
  return (
    <div>
      <div role="group" aria-label={t("library.categories")} className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {chips.map((c) => {
          const on = category === c.id;
          return (
            <button
              key={c.id}
              aria-pressed={on}
              onClick={() => setCategory(c.id)}
              className={`h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${
                on ? "btn-cyan font-bold" : "border border-border bg-surface text-muted active:bg-accent-bright/15"
              }`}
            >
              {c.id === "all" ? t("library.all") : t(`cat.${c.id}`)}
            </button>
          );
        })}
      </div>

      {category === "all" ? (
        <div className="mt-6 flex flex-col gap-8">
          {shelves.map((shelf) => (
            <section key={shelf.id} aria-labelledby={`shelf-${shelf.id}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`shelf-${shelf.id}`} className="text-[19px] font-bold tracking-[-0.01em]">{t(`cat.${shelf.id}`)}</h2>
                {interests.includes(shelf.id) && <span aria-hidden className="size-2 rounded-full bg-accent-bright shadow-[0_0_10px_2px_rgba(34,211,238,.6)]" />}
              </div>
              <ul className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-3 pt-1">
                {shelf.books.map((b) => (
                  <li key={b.slug} className="w-[38vw] max-w-[168px] shrink-0 snap-start"><Cover book={b} /></li>
                ))}
                {shelf.books.length < 3 && <li className="w-[38vw] max-w-[168px] shrink-0 snap-start" aria-hidden><SoonTile /></li>}
              </ul>
            </section>
          ))}

          {empty.length > 0 && (
            <section>
              <h2 className="text-[19px] font-bold tracking-[-0.01em]">{t("library.soon")}</h2>
              <ul className="no-scrollbar -mx-5 mt-3 flex gap-3.5 overflow-x-auto px-5 pb-2 pt-1">
                {empty.map((id) => (
                  <li key={id} className="w-[30vw] max-w-[132px] shrink-0" aria-label={t("library.soonLabel", { category: t(`cat.${id}`) })}><SoonTile label={t(`cat.${id}`)} /></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6">
          {books.filter((b) => b.category === category).map((b) => <li key={b.slug}><Cover book={b} /></li>)}
          {!books.some((b) => b.category === category) && <li><SoonTile label={t(`cat.${category}`)} /></li>}
        </ul>
      )}

      <p className="mt-10 text-center text-[12px] leading-snug text-faint">{t("library.preview")}</p>
    </div>
  );
}

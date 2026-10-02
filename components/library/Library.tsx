"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { BookCover } from "@/components/BookCover";
import { CATEGORIES, categoryById, type CategoryId } from "@/lib/content/limits";
import { formatDate } from "@/lib/i18n";
import { useBookText, useLocale, useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { coverAuthor, shortBlurb, type PreviewBook } from "@/lib/preview/catalog";
import { CarryOn } from "@/components/library/CarryOn";
import { PROGRESS_KEY, furthest, parseProgress } from "@/lib/progress";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { useToday } from "@/lib/xp/today";

const subProgress = subscribeTo(PROGRESS_KEY);
const server = () => "";
/** Books that joined within this many days are marked new. */
const NEW_DAYS = 14;
/** Languages that say much more in a line: their descriptions are cut sooner. */
const DENSE = ["zh", "ja", "ko"];

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** How far through a book the reader is (0–1), or null if they have not opened it. */
function useShare(slug: string): number | null {
  const raw = useSyncExternalStore(subProgress, () => readRaw(PROGRESS_KEY), server);
  return useMemo(() => {
    const f = furthest(parseProgress(raw), slug);
    return f ? Math.min(1, (f.index + 1) / f.length) : null;
  }, [raw, slug]);
}

/**
 * A book standing on its shelf: the cover turned a little towards you, the plank under it (the planks of
 * neighbours meet, so a row reads as one shelf), and under that its name, the day it joined and the first
 * lines of what it is about, in the reader's language (the rest is on its page).
 */
function Tile({ book, tour }: { book: PreviewBook; /** The tour points at this one (the first book on the first shelf). */ tour?: boolean }) {
  const t = useT();
  const text = useBookText();
  const locale = useLocale();
  const today = useToday();
  const share = useShare(book.slug);
  const title = text(book.slug, "title", book.title);
  const blurb = shortBlurb(text(book.slug, "blurb", book.blurb), DENSE.includes(locale) ? 30 : 64);
  const fresh = today !== "" && (new Date(`${today}T12:00:00`).getTime() - new Date(`${book.added}T12:00:00`).getTime()) / 86_400_000 <= NEW_DAYS;
  return (
    <Link href={`/book/${book.slug}`} className="group block px-2 transition-transform active:scale-[0.98]">
      <div className="relative pt-2 [perspective:700px]">
        <div data-tour={tour ? "book" : undefined} className="relative origin-left transition-transform duration-300 [transform:rotateY(-7deg)] group-active:[transform:rotateY(0deg)]">
          <BookCover slug={book.slug} title={title} author={coverAuthor(book)} hue={categoryById(book.category)?.hue ?? 30} className="drop-shadow-[0_14px_14px_rgba(8,47,60,.32)]" />
          {fresh && <span className="absolute -end-1.5 -top-1.5 rounded-full bg-accent-bright px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-foreground shadow-sm">{t("library.new")}</span>}
          {share !== null && (
            <span className="absolute inset-x-2.5 bottom-2.5 h-1.5 overflow-hidden rounded-full bg-black/35" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
              <span className="block h-full rounded-full bg-accent-bright" style={{ width: `${Math.max(6, share * 100)}%` }} />
            </span>
          )}
        </div>
      </div>
      {/* The plank. */}
      <div aria-hidden className="-mx-2 h-3 bg-gradient-to-b from-[#D8EEF4] to-[#B5DCE7] shadow-[0_10px_14px_-8px_rgba(8,47,60,.4)]" />
      <span className="mt-3 block">
        <span lang={locale} dir="auto" className="line-clamp-2 text-[14.5px] font-bold leading-tight">{title}</span>
        <span className="mt-1 block text-[11.5px] text-faint">{t("library.added", { date: formatDate(new Date(`${book.added}T12:00:00`), locale) })}</span>
        {/* No `block` here: it would undo the clamp that line-clamp sets (display: -webkit-box). */}
        <span lang={locale} dir="auto" className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted">{blurb}</span>
      </span>
    </Link>
  );
}

/** Where a book will be: the same shape as a cover, dashed, saying more is coming. */
function SoonTile({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="px-2">
      <div className="pt-2">
        <div className="flex aspect-[2/3] flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-accent-bright/35 bg-accent-bright/[0.05] px-3 text-center">
          <svg viewBox="0 0 24 24" className="mb-2 size-6 text-accent-bright" {...stroke} aria-hidden><path d="M12 6.5C10.2 5 7.6 4.5 4 4.8V18c3.6-.3 6.2.2 8 1.7 1.8-1.5 4.4-2 8-1.7V4.8c-3.6-.3-6.2.2-8 1.7z" /></svg>
          {label && <span className="text-[13px] font-semibold text-muted">{label}</span>}
          <span className={label ? "mt-1 text-[12px] text-faint" : "text-[13px] font-semibold text-faint"}>{t("library.soon")}</span>
        </div>
      </div>
      <div aria-hidden className="-mx-2 h-3 bg-gradient-to-b from-[#D8EEF4] to-[#B5DCE7] opacity-70" />
    </div>
  );
}

/**
 * The library as shelves: a search box and chips at the top, the book to carry on with under them, then one
 * shelf for each kind of book (the ones the reader said they were curious about first), each sliding sideways,
 * and under them the kinds still to come. A chip narrows it to one shelf, shown as a grid; a search shows what
 * matches.
 */
export function Library({ books }: { books: PreviewBook[] }) {
  const t = useT();
  const text = useBookText();
  const { interests } = useAnswers();
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [query, setQuery] = useState("");

  const shelves = useMemo(() => {
    const withBooks = CATEGORIES.map((c) => ({ id: c.id, hue: c.hue, books: books.filter((b) => b.category === c.id) })).filter((s) => s.books.length > 0);
    // The ones they picked come first, in the order the shelves are always in.
    return [...withBooks.filter((s) => interests.includes(s.id)), ...withBooks.filter((s) => !interests.includes(s.id))];
  }, [books, interests]);
  const empty = CATEGORIES.filter((c) => !books.some((b) => b.category === c.id)).map((c) => c.id);

  const q = query.trim().toLowerCase();
  const found = q ? books.filter((b) => [text(b.slug, "title", b.title), b.title, b.author, text(b.slug, "blurb", b.blurb)].some((s) => s.toLowerCase().includes(q))) : [];

  const chips = [{ id: "all" as const }, ...CATEGORIES];
  return (
    <div>
      <label className="relative block">
        <span className="sr-only">{t("library.search")}</span>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-faint" {...stroke} aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("library.search")} enterKeyHint="search" autoComplete="off"
               className="h-12 w-full rounded-full border border-border bg-surface ps-12 pe-4 text-[16px] outline-none placeholder:text-faint focus:border-accent-bright focus:bg-background" />
      </label>

      {q ? (
        found.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-x-2 gap-y-7">{found.map((b) => <li key={b.slug}><Tile book={b} /></li>)}</ul>
        ) : (
          <p role="status" className="mt-10 text-center text-[14.5px] text-muted">{t("library.noResults")}</p>
        )
      ) : (
        <>
          <div role="group" aria-label={t("library.categories")} className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {chips.map((c) => {
              const on = category === c.id;
              return (
                <button key={c.id} aria-pressed={on} onClick={() => setCategory(c.id)}
                        className={`h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "btn-cyan font-bold" : "border border-border bg-surface text-muted active:bg-accent-bright/15"}`}>
                  {c.id === "all" ? t("library.all") : t(`cat.${c.id}`)}
                </button>
              );
            })}
          </div>

          {category === "all" && <CarryOn books={books} />}

          {category === "all" ? (
            <div className="mt-7 flex flex-col gap-9">
              {shelves.map((shelf, si) => (
                <section key={shelf.id} aria-labelledby={`shelf-${shelf.id}`} >
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="h-6 w-1.5 rounded-full" style={{ background: `hsl(${shelf.hue} 70% 52%)` }} />
                    <h2 id={`shelf-${shelf.id}`} className="text-[20px] font-bold tracking-[-0.01em]">{t(`cat.${shelf.id}`)}</h2>
                    <span className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-bright/20 px-2 text-[12px] font-bold text-accent">{shelf.books.length}</span>
                    {interests.includes(shelf.id) && <span aria-hidden className="ms-auto size-2 rounded-full bg-accent-bright shadow-[0_0_10px_2px_rgba(34,211,238,.6)]" />}
                  </div>
                  <ul className="no-scrollbar -mx-5 mt-2 flex snap-x snap-mandatory overflow-x-auto px-3 pb-2">
                    {shelf.books.map((b, bi) => (
                      <li key={b.slug} className="w-[44vw] max-w-[186px] shrink-0 snap-start"><Tile book={b} tour={si === 0 && bi === 0} /></li>
                    ))}
                    {shelf.books.length < 3 && <li className="w-[44vw] max-w-[186px] shrink-0 snap-start" aria-hidden><SoonTile /></li>}
                  </ul>
                </section>
              ))}

              {empty.length > 0 && (
                <section>
                  <h2 className="text-[20px] font-bold tracking-[-0.01em]">{t("library.soon")}</h2>
                  <ul className="no-scrollbar -mx-5 mt-2 flex overflow-x-auto px-3 pb-2">
                    {empty.map((id) => (
                      <li key={id} className="w-[34vw] max-w-[140px] shrink-0" aria-label={t("library.soonLabel", { category: t(`cat.${id}`) })}><SoonTile label={t(`cat.${id}`)} /></li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-x-2 gap-y-7">
              {books.filter((b) => b.category === category).map((b) => <li key={b.slug}><Tile book={b} /></li>)}
              {!books.some((b) => b.category === category) && <li><SoonTile label={t(`cat.${category}`)} /></li>}
            </ul>
          )}
        </>
      )}

      <p className="mt-10 text-center text-[12px] leading-snug text-faint">{t("library.preview")}</p>
    </div>
  );
}

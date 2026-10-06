"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useT } from "@/lib/i18n/react";
import { useSaved } from "@/lib/srs/use";
import { wordsOfBook } from "@/lib/words/saved";

/**
 * On a book's page: the words the reader saved from this book (owner, 6 Oct 2026), and a way to practise every one of
 * them, due or not (/recall/flashcards?book=<slug>). With none saved yet it says how to save one.
 */
export function BookWords({ slug, titles }: { slug: string; /** The book's names (its own, and as the reader's language shows it), for words saved before the slug was kept. */ titles: readonly string[] }) {
  const t = useT();
  const saved = useSaved();
  const n = useMemo(() => wordsOfBook(saved, slug, titles).length, [saved, slug, titles]);
  return (
    <section className="sheet-card rounded-[24px] p-4" aria-label={t("book.words.title")} data-book-words>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ob-deep)]">{t("book.words.title")}</h2>
      {n > 0 ? (
        <>
          <p className="mt-2.5 text-[14.5px] font-semibold leading-snug">{n === 1 ? t("book.words.one") : t("book.words.many", { n })}</p>
          <Link href={`/recall/flashcards?book=${encodeURIComponent(slug)}`} className="btn-cyan mt-3 inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-[15.5px] font-bold">
            {t("book.words.practise")}
          </Link>
        </>
      ) : (
        <p className="mt-2.5 text-[13.5px] leading-snug text-muted">{t("book.words.none")}</p>
      )}
    </section>
  );
}

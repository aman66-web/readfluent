"use client";

import Link from "next/link";
import { bookDeckLevel } from "@/lib/decks/books";
import { useT } from "@/lib/i18n/react";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { useAnswers } from "@/lib/onboarding/use-answers";

/**
 * On a book's page: the book's own phrases in the language being learned (owner, 7 Oct 2026), each a flashcard, in the order of
 * the story (/recall/flashcards?phrases=<slug>&lang=<code>). Only there where the book has a deck in that language.
 */
export function BookPhrases({ slug }: { slug: string }) {
  const t = useT();
  const learn = useAnswers().learn;
  if (!learn || !bookDeckLevel(slug, learn)) return null;
  const language = LANGUAGES.find((l) => l.code === learn)?.native ?? learn;
  return (
    <section className="sheet-card rounded-[24px] p-4" aria-label={t("book.phrases.title")} data-book-phrases>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ob-deep)]">{t("book.phrases.title")}</h2>
      <p className="mt-2.5 text-[13.5px] leading-snug text-muted">{t("book.phrases.sub", { language })}</p>
      <Link href={`/recall/flashcards?phrases=${encodeURIComponent(slug)}&lang=${learn}`} className="btn-cyan mt-3 inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-[15.5px] font-bold">
        {t("book.phrases.practise")}
      </Link>
    </section>
  );
}

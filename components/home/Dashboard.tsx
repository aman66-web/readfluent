"use client";

import Link from "next/link";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { BookCover } from "@/components/BookCover";
import { LibraryHeader } from "@/components/library/Header";
import { categoryById } from "@/lib/content/limits";
import { useLocale, useT } from "@/lib/i18n/react";
import { DEFAULT_MINUTES } from "@/lib/onboarding/firstrun";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { findBook } from "@/lib/preview/catalog";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { LEDGER_KEY, parseLedger, streak, totalXp } from "@/lib/xp/ledger";
import { dayDate, useToday } from "@/lib/xp/today";
import { LevelCard } from "./LevelCard";
import { StudyChart } from "./StudyChart";

const subscribeLedger = subscribeTo(LEDGER_KEY);
const readLedger = () => readRaw(LEDGER_KEY);
const serverLedger = () => "";

/**
 * The home screen: where the reader stands (level, XP and the bar to the next level),
 * how their reading has gone (the graph), where to carry on, and then the library.
 */
export function Dashboard() {
  const t = useT();
  const locale = useLocale();
  const a = useAnswers();
  const raw = useSyncExternalStore(subscribeLedger, readLedger, serverLedger);
  const ledger = useMemo(() => parseLedger(raw), [raw]);
  const goal = a.daily ?? DEFAULT_MINUTES;
  const bookName = useCallback((slug: string) => findBook(slug)?.title ?? slug, []);
  const today = useToday();
  const run = useMemo(() => (today ? streak(ledger, dayDate(today)) : 0), [ledger, today]);
  const carry = ledger.lastSlug ? findBook(ledger.lastSlug) : null;
  const date = useMemo(() => {
    try { return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(dayDate(today)); } catch { return ""; }
  }, [locale, today]);

  return (
    <main className="safe-top px-5 pb-32 [--pt:1.5rem]">
      <LibraryHeader />
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-faint" suppressHydrationWarning>{date}</p>
        {run > 0 && (
          <span className="tabular inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-[12px] font-bold ring-1 ring-inset ring-border" role="img" aria-label={t("home.streak", { n: run })}>
            <svg viewBox="0 0 24 24" className="size-3.5 text-accent" fill="currentColor" aria-hidden><path d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.5 1 2.5 2 2.5 1.7 0 2.5-1.8 2-3.5 2.5 1.7 4 4 4 6.5a6.5 6.5 0 0 1-13 0C5.5 10 9 8 12 2z" /></svg>
            {run}
          </span>
        )}
      </div>
      <h2 className="mt-1 text-[28px] font-light leading-[1.1] tracking-[-0.03em]">{t("home.ready")}</h2>

      <div className="mt-4">
        <LevelCard xp={totalXp(ledger)} learn={a.learn} />
        <StudyChart ledger={ledger} goal={goal} bookName={bookName} />
      </div>

      {carry && (
        <Link href={`/book/${carry.slug}`} className="mt-3 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-3.5 active:opacity-80">
          <BookCover title={carry.title} author={carry.author} hue={categoryById(carry.category)?.hue ?? 30} className="w-[52px] shrink-0 !p-1.5 [&_p]:!text-[7px] [&_div:first-child]:hidden" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{t("home.carryOn")}</span>
            <span className="mt-0.5 block truncate text-[16px] font-semibold" dir="auto">{carry.title}</span>
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-faint rtl:-scale-x-100" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
        </Link>
      )}

      <Link href="/library" className="mt-3 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-4 active:opacity-80">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-bright/25 text-accent" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M12 6.5C10.2 5 7.6 4.5 4 4.8V18c3.6-.3 6.2.2 8 1.7 1.8-1.5 4.4-2 8-1.7V4.8c-3.6-.3-6.2.2-8 1.7z" /><path d="M12 6.5v13.2" /></svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{t("home.browse")}</span>
          <span className="mt-0.5 block text-[12.5px] text-muted">{t("home.browseSub")}</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-faint rtl:-scale-x-100" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
      </Link>
    </main>
  );
}

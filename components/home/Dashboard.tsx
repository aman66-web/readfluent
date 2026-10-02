"use client";

import Link from "next/link";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { BookCover } from "@/components/BookCover";
import { ProfileButton } from "@/components/home/ProfileButton";
import { categoryById } from "@/lib/content/limits";
import { useBookText, useLocale, useT } from "@/lib/i18n/react";
import { DEFAULT_MINUTES } from "@/lib/onboarding/firstrun";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { findBook, coverAuthor, PREVIEW_BOOKS } from "@/lib/preview/catalog";
import { CarryOn } from "@/components/library/CarryOn";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { LEDGER_KEY, parseLedger, streak, totalXp } from "@/lib/xp/ledger";
import { dayDate, useToday } from "@/lib/xp/today";
import { Targets } from "@/components/home/Targets";
import { FriendsCard } from "@/components/friends/FriendsCard";
import { NewBadge } from "@/components/badges/NewBadge";
import { LevelCard } from "./LevelCard";
import { StudyChart } from "./StudyChart";

/** The covers fanned on the way into the library. */
const FAN = ["alice-s-adventures-in-wonderland", "pride-and-prejudice", "the-hound-of-the-baskervilles"] as const;

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
  const bookText = useBookText();
  const bookName = useCallback((slug: string) => { const b = findBook(slug); return b ? bookText(slug, "title", b.title) : slug; }, [bookText]);
  const today = useToday();
  const run = useMemo(() => (today ? streak(ledger, dayDate(today)) : 0), [ledger, today]);
  const date = useMemo(() => {
    try { return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(dayDate(today)); } catch { return ""; }
  }, [locale, today]);

  return (
    <main className="safe-top px-5 pb-32 [--pt:1.5rem]">
      {/* No title bar: the date and the day's greeting up top, the streak and the profile at the corner. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-faint" suppressHydrationWarning>{date}</p>
          <h2 className="mt-1 text-[28px] font-light leading-[1.1] tracking-[-0.03em]">{t("home.ready")}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {run > 0 && (
            <span className="tabular inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[12px] font-bold ring-1 ring-inset ring-border" role="img" aria-label={t("home.streak", { n: run })}>
              <svg viewBox="0 0 24 24" className="size-3.5 text-accent" fill="currentColor" aria-hidden><path d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.5 1 2.5 2 2.5 1.7 0 2.5-1.8 2-3.5 2.5 1.7 4 4 4 6.5a6.5 6.5 0 0 1-13 0C5.5 10 9 8 12 2z" /></svg>
              {run}
            </span>
          )}
          <ProfileButton />
        </div>
      </div>

      <div className="mt-4">
        <LevelCard xp={totalXp(ledger)} learn={a.learn} />
        <NewBadge />
        <Targets />
        <FriendsCard />
        <StudyChart ledger={ledger} goal={goal} bookName={bookName} />
      </div>

      <CarryOn books={PREVIEW_BOOKS} />

      {/* The way into the library: a fan of covers, so it looks like somewhere you want to go. */}
      <Link href="/library" className="relative mt-3 flex items-center gap-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#E3F8FC] to-[#BFEFF9] p-4 shadow-[0_18px_30px_-22px_rgba(8,47,60,.6)] active:opacity-90">
        <span className="relative block h-[84px] w-[92px] shrink-0" aria-hidden>
          {FAN.map((slug, i) => {
            const b = findBook(slug);
            return b ? (
              <span key={slug} className="absolute top-0 block w-[46px] drop-shadow-[0_6px_6px_rgba(8,47,60,.35)]" style={{ left: i * 18, transform: `rotate(${(i - 1) * 7}deg)`, zIndex: i === 1 ? 3 : 1 + i }}>
                <BookCover slug={b.slug} title={b.title} author={coverAuthor(b)} hue={categoryById(b.category)?.hue ?? 30} />
              </span>
            ) : null;
          })}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold tracking-[-0.01em]">{t("home.browse")}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-foreground/70">{t("home.browseSub")}</span>
        </span>
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-bright text-on-cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-5 rtl:-scale-x-100"><path d="M9 5l7 7-7 7" /></svg></span>
      </Link>
    </main>
  );
}

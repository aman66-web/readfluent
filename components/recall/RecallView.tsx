"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { DECK_SIZES, type DeckSize } from "@/lib/decks";
import { languageName } from "@/lib/i18n";
import type { MessageId } from "@/lib/i18n/en";
import { useLocale, useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { buildSession, deckProgress } from "@/lib/srs/session";
import { useDeviceReady, useNowMinute, useSaved, useSrs } from "@/lib/srs/use";
import { withCardsFor } from "@/lib/srs/store";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { supportFor } from "@/lib/tests/support";
import { XP, levelFromXp } from "@/lib/xp/levels";
import { LEDGER_KEY, parseLedger, totalXp } from "@/lib/xp/ledger";

const subLedger = subscribeTo(LEDGER_KEY);
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Bolt = () => <svg viewBox="0 0 24 24" className="size-3.5" {...stroke} strokeWidth={2.2} aria-hidden><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></svg>;

/**
 * Where the reader practises, in three big ways (flashcards, tests, speaking) and then a package for them:
 * the phrase decks of the language they are learning and a test at their level. Flashcards and tests pay more
 * XP than reading, so each tile says so.
 */
export function RecallView({ talkReady = true }: { /** Whether the server can run Talk (a model key and a database); false shows it as coming soon. */ talkReady?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const a = useAnswers();
  const ready = useDeviceReady();
  const srs = useSrs();
  const now = useNowMinute();
  const saved = useSaved();
  const learn = a.learn;
  const language = learn ? languageName(learn, locale) : "";
  const ledgerRaw = useSyncExternalStore(subLedger, () => readRaw(LEDGER_KEY), () => "");
  const mine = useMemo(() => levelFromXp(totalXp(parseLedger(ledgerRaw))), [ledgerRaw]);
  const support = supportFor(learn);
  const hasTests = !!support;
  // The package test and the range shown follow what this language has: its levels and its first kind of test.
  const packLevel = support ? (support.levels.includes(mine.level) ? mine.level : support.levels[support.levels.length - 1]) : mine.level;
  const packKind = support?.kinds[0] ?? "mixed";
  const range = support ? `${support.levels[0]} – ${support.levels[support.levels.length - 1]}` : "A1 – C2";

  // Saved words count as cards even before the first review has handed them one.
  const cards = useMemo(() => (ready ? withCardsFor(srs, saved, 0).cards : {}), [ready, srs, saved]);
  const due = useMemo(() => (ready ? buildSession(Object.values(cards), now).length : 0), [ready, cards, now]);
  const noCards = ready && Object.keys(cards).length === 0;

  return (
    <main className="safe-top px-5 pb-32 [--pt:1.5rem]">
      <header className="flex items-start justify-between gap-3">
        <h1 className="title-display">{t("recall.title")}</h1>
        <span className="-mt-1 block w-[64px] shrink-0"><Mascot mood={due > 0 ? "ready" : "hello"} className="w-full" /></span>
      </header>

      {/* The language being learned and the reader's level in it. */}
      <Link href="/languages" className="mt-3 flex items-center gap-3.5 rounded-2xl py-1 active:opacity-70">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#67E8F9] to-[#22D3EE] text-[17px] font-extrabold uppercase text-on-cyan shadow-[0_10px_20px_-10px_rgba(8,145,178,.7)]">{learn ?? "?"}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[19px] font-bold leading-tight tracking-[-0.01em]" lang={learn ?? undefined}>
            {language || t("recall.deckPick")}
            <svg viewBox="0 0 24 24" className="size-4 text-faint" {...stroke} strokeWidth={2.4} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
          </span>
          <span className="mt-0.5 block text-[13.5px] text-muted">{t("recall.yourLevel", { code: mine.code })}</span>
        </span>
      </Link>

      {/* Three ways to practise: one tall tile and two small ones. */}
      <div className="mt-4 grid grid-cols-2 grid-rows-[auto_auto] gap-3">
        <Link href="/recall/flashcards" data-way="cards" className="relative row-span-2 flex min-h-[19rem] flex-col overflow-hidden rounded-[28px] pb-16 bg-gradient-to-b from-[#67E8F9] to-[#22D3EE] p-4 text-on-cyan shadow-[0_22px_34px_-22px_rgba(8,145,178,.9)] active:scale-[0.98]">
          <svg viewBox="0 0 24 24" className="relative mt-6 size-12 self-center" {...stroke} strokeWidth={1.6} aria-hidden><rect x="3" y="7" width="14" height="11" rx="2.5" /><path d="M7 7V6a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H17" /></svg>
          <span className="relative z-10 mt-3 min-w-0 text-center text-[clamp(16px,5vw,20px)] font-bold tracking-[-0.01em] [overflow-wrap:anywhere] [line-break:strict]">{t("cards.title")}</span>
          <span className="relative z-10 mt-1 text-center text-[13px] leading-snug opacity-80 [line-break:strict]" data-due={due}>{ready ? (due > 0 ? t("cards.due", { n: due }) : noCards ? t("cards.noneYet") : t("cards.dueNone")) : " "}</span>
          <span className="tabular relative z-10 mt-3 inline-flex items-center gap-1 self-center rounded-full bg-white/40 px-2.5 py-1 text-[11.5px] font-bold"><Bolt />{t("recall.boost.cards", { xp: XP.card.easy })}</span>
          {/* A little stack of cards in the corner. */}
          <span aria-hidden className="pointer-events-none absolute -start-3 bottom-4 block h-9 w-24 -rotate-3 rounded-xl bg-white/55" />
          <span aria-hidden className="pointer-events-none absolute -start-4 bottom-9 block h-9 w-24 rotate-2 rounded-xl bg-white/35" />
          <span aria-hidden className="pointer-events-none absolute -start-2 bottom-0 block h-9 w-24 -rotate-1 rounded-xl bg-[#0E7490]/70" />
        </Link>

        <Link href={hasTests ? "/recall/tests" : "/languages"} data-way="tests" className="relative flex min-h-[9rem] flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0E7490] to-[#0A566E] p-4 text-white shadow-[0_18px_28px_-20px_rgba(8,47,60,.9)] active:scale-[0.98]">
          <svg viewBox="0 0 24 24" className="size-9" {...stroke} strokeWidth={1.7} aria-hidden><path d="M9 11l2.5 2.5L16 9" /><rect x="4" y="4" width="16" height="16" rx="3.5" /></svg>
          <span>
            <span className="block text-[18px] font-bold leading-tight tracking-[-0.01em]">{t("tests.title")}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug opacity-80">{range}</span>
            <span className="tabular mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold"><Bolt />{t("recall.boost.tests", { xp: XP.test.correct })}</span>
          </span>
        </Link>

        <Link href="/recall/talk" data-way="talk" className="relative flex min-h-[9rem] flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-[#DDD6FE] to-[#C4B5FD] p-4 text-on-cyan shadow-[0_18px_28px_-20px_rgba(91,33,182,.55)] active:scale-[0.98]">
          <svg viewBox="0 0 24 24" className="size-9" {...stroke} strokeWidth={1.7} aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          <span>
            <span className="block text-[18px] font-bold leading-tight tracking-[-0.01em]">{t("recall.speaking")}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug opacity-75">{t(talkReady ? "recall.talkNow" : "recall.soon", { name: "Dewey" })}</span>
          </span>
        </Link>
      </div>

      <h2 className="mt-8 text-[19px] font-bold tracking-[-0.01em]">{t("recall.package")}</h2>
      <ul className="mt-3 grid gap-3">
        {hasTests && (
          <li>
            <Link href={`/recall/tests/${packLevel}/${packKind}`} data-pack="test" className="relative flex items-center gap-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#E3F8FC] to-[#C9F1FA] p-4 shadow-[inset_0_0_0_1px_rgba(8,145,178,.18)] active:scale-[0.99]">
              <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-bright text-on-cyan"><svg viewBox="0 0 24 24" className="size-7" {...stroke} aria-hidden><path d="M9 11l2.5 2.5L16 9" /><rect x="4" y="4" width="16" height="16" rx="3.5" /></svg></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16.5px] font-bold leading-tight">{t("recall.pack.test", { level: packLevel })}</span>
                <span className="mt-0.5 block text-[13px] text-foreground/70">{t(`tests.kind.${packKind}.sub` as MessageId)}</span>
              </span>
              <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-[var(--ob-deep)] rtl:-scale-x-100" {...stroke} strokeWidth={2.4} aria-hidden><path d="M9 5l7 7-7 7" /></svg>
            </Link>
          </li>
        )}
        {learn ? DECK_SIZES.map((size) => <DeckRow key={size} size={size} lang={learn} language={language} cards={cards} ready={ready} />) : (
          <li><Link href="/languages" className="sheet-card flex min-h-14 items-center rounded-[22px] px-4 text-[14.5px] text-muted">{t("recall.deckPick")}</Link></li>
        )}
      </ul>
    </main>
  );
}

function DeckRow({ size, lang, language, cards, ready }: { size: DeckSize; lang: string; language: string; cards: ReturnType<typeof withCardsFor>["cards"]; ready: boolean }) {
  const t = useT();
  const p = deckProgress(cards, lang, size);
  const started = p.met > 0 || Object.keys(cards).some((id) => id.startsWith(`deck:${lang}:`));
  const pct = Math.round((p.learned / size) * 100);
  return (
    <li data-deck={size}>
      <Link href={`/recall/flashcards?deck=${size}&lang=${lang}`} className="relative flex items-center gap-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#E0E7FF] to-[#C7D2FE] p-4 shadow-[inset_0_0_0_1px_rgba(79,70,229,.14)] active:scale-[0.99]">
        <span aria-hidden className="tabular grid size-14 shrink-0 place-items-center rounded-2xl bg-white/80 text-[22px] font-extrabold tracking-[-0.03em] text-[#3730A3]">{size}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16.5px] font-bold leading-tight">{t(size === 50 ? "recall.deck50" : "recall.deck100")}</span>
          <span className="mt-0.5 block text-[13px] text-foreground/70">{language ? `${language} · ` : ""}{ready ? t("recall.deckProgress", { n: p.learned, total: size }) : " "}</span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/60" aria-hidden><span className="block h-full rounded-full bg-[#6366F1]" style={{ width: `${pct}%` }} /></span>
        </span>
        <span className="shrink-0 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-bold text-[#3730A3]">{t(started ? "recall.deckContinue" : "recall.deckStart")}</span>
      </Link>
    </li>
  );
}

"use client";

import Link from "next/link";
import { DECK_SIZES, type DeckSize } from "@/lib/decks";
import { TOPICS, TOPIC_SIZE, type TopicId } from "@/lib/decks/topics";
import { languageName } from "@/lib/i18n";
import type { MessageId } from "@/lib/i18n/en";
import { useLocale, useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { deckProgress, topicProgress } from "@/lib/srs/session";
import { useDeviceReady, useSrs } from "@/lib/srs/use";

/**
 * The decks to choose from, in the language being learned: the essential phrases (top 50, top 100) and a deck for each of
 * twelve topics. Each shows how far along it is; a tap opens it as a sitting of flashcards (a few new cards at a time).
 */
export function DecksView() {
  const t = useT();
  const locale = useLocale();
  const a = useAnswers();
  const ready = useDeviceReady();
  const srs = useSrs();
  const learn = a.learn;
  const language = learn ? languageName(learn, locale) : "";
  return (
    <main className="safe-top safe-bottom px-5 pb-28 [--pb:1.5rem] [--pt:.5rem]">
      <Link href="/recall" aria-label={t("cards.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </Link>
      <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.02em]">{t("recall.decks.title")}</h1>
      {learn ? <p className="mt-1 text-[14.5px] text-muted">{t("recall.decks.sub", { language })}</p> : (
        <Link href="/languages" className="mt-4 flex min-h-14 items-center rounded-[22px] border border-border px-4 text-[14.5px] text-muted">{t("recall.deckPick")}</Link>
      )}
      {learn && (
        <>
          <h2 className="mt-7 text-[17px] font-bold tracking-[-0.01em]">{t("recall.decks.phrases")}</h2>
          <ul className="mt-3 grid gap-3">
            {DECK_SIZES.map((size) => <PhraseRow key={size} size={size} lang={learn} cards={srs.cards} ready={ready} />)}
          </ul>
          <h2 className="mt-8 text-[17px] font-bold tracking-[-0.01em]">{t("recall.decks.topics")}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {TOPICS.map((tp) => <TopicTile key={tp.id} id={tp.id} icon={tp.icon} lang={learn} cards={srs.cards} ready={ready} />)}
          </ul>
        </>
      )}
    </main>
  );
}

type Cards = ReturnType<typeof useSrs>["cards"];

function PhraseRow({ size, lang, cards, ready }: { size: DeckSize; lang: string; cards: Cards; ready: boolean }) {
  const t = useT();
  const p = deckProgress(cards, lang, size);
  return (
    <li data-deck={size}>
      <Link href={`/recall/flashcards?deck=${size}&lang=${lang}`} className="relative flex items-center gap-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#E0E7FF] to-[#C7D2FE] p-4 shadow-[inset_0_0_0_1px_rgba(79,70,229,.14)] active:scale-[0.99]">
        <span aria-hidden className="tabular grid size-14 shrink-0 place-items-center rounded-2xl bg-white/80 text-[22px] font-extrabold tracking-[-0.03em] text-[#3730A3]">{size}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16.5px] font-bold leading-tight">{t(size === 50 ? "recall.deck50" : "recall.deck100")}</span>
          <span className="mt-0.5 block text-[13px] text-foreground/70">{ready ? t("recall.deckProgress", { n: p.learned, total: size }) : " "}</span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/60" aria-hidden><span className="block h-full rounded-full bg-[#6366F1]" style={{ width: `${Math.round((p.learned / size) * 100)}%` }} /></span>
        </span>
      </Link>
    </li>
  );
}

function TopicTile({ id, icon, lang, cards, ready }: { id: TopicId; icon: string; lang: string; cards: Cards; ready: boolean }) {
  const t = useT();
  const p = topicProgress(cards, lang, id);
  return (
    <li data-topic={id}>
      <Link href={`/recall/flashcards?topic=${id}&lang=${lang}`} className="relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-[22px] bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] p-3.5 shadow-[inset_0_0_0_1px_rgba(13,148,136,.16)] active:scale-[0.98]">
        <span aria-hidden className="text-[28px] leading-none">{icon}</span>
        <span>
          <span className="block text-[15px] font-bold leading-tight [overflow-wrap:anywhere]">{t(`topic.${id}` as MessageId)}</span>
          <span className="mt-0.5 block text-[12px] text-foreground/65">{ready ? t("recall.deckProgress", { n: p.learned, total: TOPIC_SIZE }) : " "}</span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/70" aria-hidden><span className="block h-full rounded-full bg-[#14B8A6]" style={{ width: `${Math.round((p.learned / TOPIC_SIZE) * 100)}%` }} /></span>
        </span>
      </Link>
    </li>
  );
}

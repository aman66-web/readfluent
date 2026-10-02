"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { DECK_SIZES, type DeckSize } from "@/lib/decks";
import { useT } from "@/lib/i18n/react";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { buildSession, deckProgress, MAX_PER_SESSION } from "@/lib/srs/session";
import { useDeviceReady, useNowMinute, useSaved, useSrs } from "@/lib/srs/use";
import { withCardsFor } from "@/lib/srs/store";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * Where the reader practises: their own cards (the words they saved, due now), the phrase decks of the
 * language they are learning, and a conversation with Dewey in it.
 */
export function RecallView() {
  const t = useT();
  const a = useAnswers();
  const ready = useDeviceReady();
  const srs = useSrs();
  const now = useNowMinute();
  const saved = useSaved();
  const learn = a.learn;
  const language = LANGUAGES.find((l) => l.code === learn)?.native ?? "";

  // Saved words count as cards even before the first review has handed them one.
  const cards = useMemo(() => (ready ? withCardsFor(srs, saved, 0).cards : {}), [ready, srs, saved]);
  const due = useMemo(() => (ready ? buildSession(Object.values(cards), now).length : 0), [ready, cards, now]);
  const total = Object.keys(cards).filter((id) => !id.startsWith("deck:")).length;
  const anyDeck = Object.keys(cards).length > total;

  return (
    <main className="safe-top px-5 pb-32 [--pt:1.5rem]">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="title-display">{t("recall.title")}</h1>
          <p className="mt-1.5 max-w-[16.5rem] text-[14.5px] leading-snug text-muted">{t("recall.sub")}</p>
        </div>
        <span className="-mt-1 block w-[78px] shrink-0"><Mascot mood={due > 0 ? "ready" : "hello"} className="w-full" /></span>
      </header>

      {/* The cards waiting, with a hand of cards behind the number. */}
      <section aria-labelledby="rc-cards" className="relative mt-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-accent to-[#0A4B62] p-5 text-white shadow-[0_22px_36px_-22px_rgba(8,47,60,.85)]">
        <span aria-hidden className="pointer-events-none absolute -end-6 top-4 block h-28 w-24 rotate-[14deg] rounded-2xl bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -end-2 top-6 block h-28 w-24 rotate-[6deg] rounded-2xl bg-white/15" />
        <span aria-hidden className="pointer-events-none absolute end-3 top-8 grid h-28 w-24 -rotate-[2deg] place-items-center rounded-2xl bg-white text-accent shadow-lg">
          <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="14" height="11" rx="2.5" /><path d="M7 7V6a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H17" /></svg>
        </span>
        <h2 id="rc-cards" className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/75">{t("recall.yourCards")}</h2>
        <p className="mt-2 max-w-[11rem] text-[27px] font-bold leading-tight tracking-[-0.02em]" data-due={due}>{ready ? t("cards.due", { n: due }) : "\u00a0"}</p>
        <p className="mt-1.5 max-w-[11rem] text-[13px] leading-snug text-white/80">{total > 0 ? t("cards.total", { n: total }) : t("cards.empty")}</p>
        {due > 0 ? (
          <Link href="/recall/flashcards" className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-white text-[15.5px] font-bold text-accent shadow-[0_10px_20px_-10px_rgba(0,0,0,.5)] active:bg-white/90">
            {t("cards.start")} · {Math.min(due, MAX_PER_SESSION)}
          </Link>
        ) : total > 0 || anyDeck ? (
          <p className="mt-5 text-[14px] font-semibold text-white">{t("cards.dueNone")}</p>
        ) : null}
      </section>

      <h2 className="mt-8 flex items-baseline justify-between gap-3 text-[19px] font-bold tracking-[-0.01em]">
        {t("recall.deckTitle")}
        {learn ? <span className="text-[13px] font-semibold text-accent" lang={learn}>{language}</span> : null}
      </h2>
      {learn ? (
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {DECK_SIZES.map((size) => (
            <DeckRow key={size} size={size} lang={learn} cards={cards} ready={ready} />
          ))}
        </ul>
      ) : (
        <Link href="/languages" className="mt-3 flex min-h-14 items-center rounded-[22px] border border-border bg-surface px-4 text-[14.5px] text-muted">{t("recall.deckPick")}</Link>
      )}

      {/* A conversation: Dewey's own corner. */}
      <Link href="/recall/talk" data-way="talk" className="relative mt-5 flex items-center gap-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#E3F8FC] to-[#BFEFF9] p-4 shadow-[0_18px_30px_-22px_rgba(8,47,60,.6)] active:opacity-90">
        <span className="relative block w-[84px] shrink-0"><Mascot mood="hello" talking className="w-full" /></span>
        <div className="relative min-w-0 flex-1">
          <h3 className="text-[18px] font-bold leading-tight tracking-[-0.01em]">{t("recall.talkNow", { name: "Dewey" })}</h3>
          <p className="mt-1 text-[13.5px] leading-snug text-foreground/70">{t("recall.talkDesc2", { name: "Dewey", language: language || "…" })}</p>
        </div>
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white"><svg viewBox="0 0 24 24" className="size-5 rtl:-scale-x-100" {...stroke} strokeWidth={2.4}><path d="M9 5l7 7-7 7" /></svg></span>
      </Link>

      <Link href="/library" className="mt-4 flex h-14 items-center justify-center btn-cyan rounded-full text-[16px] font-bold">
        {t("home.browse")}
      </Link>
    </main>
  );
}

function DeckRow({ size, lang, cards, ready }: { size: DeckSize; lang: string; cards: ReturnType<typeof withCardsFor>["cards"]; ready: boolean }) {
  const t = useT();
  const p = deckProgress(cards, lang, size);
  const started = p.met > 0 || Object.keys(cards).some((id) => id.startsWith(`deck:${lang}:`));
  const pct = Math.round((p.learned / size) * 100);
  return (
    <li data-deck={size} className="flex flex-col rounded-[24px] bg-surface p-4 shadow-[0_14px_26px_-20px_rgba(8,47,60,.6)] ring-1 ring-border">
      <span className="text-[44px] font-extrabold leading-none tracking-[-0.03em] text-accent">{size}</span>
      <h3 className="mt-1 text-[14.5px] font-bold leading-tight">{t(size === 50 ? "recall.deck50" : "recall.deck100")}</h3>
      <p className="mt-0.5 text-[12.5px] text-muted">{ready ? t("recall.deckProgress", { n: p.learned, total: size }) : "\u00a0"}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent-bright/20" aria-hidden>
        <div className="h-full rounded-full bg-accent-bright" style={{ width: `${pct}%` }} />
      </div>
      <Link href={`/recall/flashcards?deck=${size}&lang=${lang}`} className="btn-cyan mt-3.5 flex h-11 items-center justify-center rounded-full text-[14px] font-bold">
        {t(started ? "recall.deckContinue" : "recall.deckStart")}
      </Link>
    </li>
  );
}

"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { DECK_SIZES, type DeckSize } from "@/lib/decks";
import { useT } from "@/lib/i18n/react";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { buildSession, deckProgress, MAX_PER_SESSION } from "@/lib/srs/session";
import { useDeviceReady, useNowMinute, useSaved, useSrs } from "@/lib/srs/use";
import { withCardsFor } from "@/lib/srs/store";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Icon = ({ children }: { children: ReactNode }) => <svg viewBox="0 0 24 24" className="size-6" {...stroke} aria-hidden>{children}</svg>;

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
      <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("recall.title")}</h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">{t("recall.sub")}</p>

      <section aria-labelledby="rc-cards" className="mt-6 overflow-hidden rounded-[24px] bg-accent p-5 text-white">
        <h2 id="rc-cards" className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/75">{t("recall.yourCards")}</h2>
        <p className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.02em]" data-due={due}>{ready ? t("cards.due", { n: due }) : "\u00a0"}</p>
        <p className="mt-1.5 text-[13.5px] text-white/80">{total > 0 ? t("cards.total", { n: total }) : t("cards.empty")}</p>
        {due > 0 ? (
          <Link href="/recall/flashcards" className="mt-4 flex h-12 items-center justify-center rounded-full bg-white text-[15.5px] font-bold text-accent active:bg-white/90">
            {t("cards.start")} · {Math.min(due, MAX_PER_SESSION)}
          </Link>
        ) : total > 0 || anyDeck ? (
          <p className="mt-4 text-[14px] font-semibold text-white">{t("cards.dueNone")}</p>
        ) : null}
      </section>

      <h2 className="mt-8 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("recall.deckTitle")}</h2>
      {learn ? (
        <>
          <p className="mt-1 text-[14px] text-muted">{t("recall.deckSub", { language })}</p>
          <ul className="mt-3 space-y-3">
            {DECK_SIZES.map((size) => (
              <DeckRow key={size} size={size} lang={learn} cards={cards} ready={ready} />
            ))}
          </ul>
        </>
      ) : (
        <Link href="/languages" className="mt-3 flex min-h-14 items-center rounded-[22px] border border-border bg-surface px-4 text-[14.5px] text-muted">{t("recall.deckPick")}</Link>
      )}

      <h2 className="mt-8 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("recall.ways")}</h2>
      <Link href="/recall/talk" data-way="talk" className="mt-3 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-4 active:bg-border/40">
        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent-bright/25">
          <Mascot mood="hello" crop="head" className="block h-12 w-auto" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{t("recall.talkNow", { name: "Dewey" })}</h3>
          <p className="mt-1 text-[14px] leading-snug text-muted">{t("recall.talkDesc2", { name: "Dewey", language: language || "…" })}</p>
        </div>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted rtl:-scale-x-100" {...stroke} aria-hidden><path d="M9 5l7 7-7 7" /></svg>
      </Link>

      {total === 0 && !anyDeck ? (
        <div className="mt-6 flex items-center gap-4 rounded-[22px] border border-border bg-surface px-4 py-4">
          <Mascot mood="sleepy" className="block h-[84px] w-auto shrink-0" />
          <p className="text-[14px] leading-snug text-muted">{t("recall.empty")}</p>
        </div>
      ) : null}

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
    <li data-deck={size} className="rounded-[22px] border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-bright/25 text-accent">
          <Icon><rect x="3" y="7" width="14" height="11" rx="2.5" /><path d="M7 7V6a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H17" /></Icon>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{t(size === 50 ? "recall.deck50" : "recall.deck100")}</h3>
          <p className="mt-0.5 text-[13.5px] text-muted">{ready ? t("recall.deckProgress", { n: p.learned, total: size }) : " "}</p>
        </div>
      </div>
      <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-border" aria-hidden>
        <div className="h-full rounded-full bg-accent-bright" style={{ width: `${pct}%` }} />
      </div>
        <Link href={`/recall/flashcards?deck=${size}&lang=${lang}`} className="btn-cyan mt-3.5 flex h-11 items-center justify-center rounded-full text-[14.5px] font-bold">
          {t(started ? "recall.deckContinue" : "recall.deckStart")}
        </Link>
    </li>
  );
}

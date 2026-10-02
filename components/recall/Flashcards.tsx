"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { loadDeck, parseDeckCardId, type DeckSize, type Phrase } from "@/lib/decks";
import { useT } from "@/lib/i18n/react";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { canSpeak, speak, stopSpeaking } from "@/lib/reading/speak";
import { previewDays, type Grade } from "@/lib/srs/schedule";
import { buildSession, inDeck } from "@/lib/srs/session";
import { answerCard, parseSrs, saveSrs, sittingState, SRS_KEY } from "@/lib/srs/store";
import { useDeviceReady, useSaved, useSrs } from "@/lib/srs/use";
import { readRaw } from "@/lib/store/local";
import { SAVED_KEY, parseSaved } from "@/lib/words/saved";

/** What a card shows: the word or phrase, and what it means. */
interface Face { front: string; back: string; hint?: string; lang: string; book?: string }

const GRADES: readonly { grade: Grade; label: "cards.again" | "cards.good" | "cards.easy"; tone: string }[] = [
  { grade: "again", label: "cards.again", tone: "border-rose-300 bg-rose-50 text-rose-700 active:bg-rose-100" },
  { grade: "good", label: "cards.good", tone: "border-accent-bright bg-accent-bright/20 text-accent active:bg-accent-bright/35" },
  { grade: "easy", label: "cards.easy", tone: "border-emerald-300 bg-emerald-50 text-emerald-700 active:bg-emerald-100" },
];

/**
 * One sitting of flashcards. `deck` narrows it to the first 50 or 100 phrases of `lang`'s deck; with no
 * deck it is everything due: the saved words and the phrases of any deck that was started.
 */
export function Flashcards({ deck, lang }: { deck: DeckSize | null; lang: string | null }) {
  const ready = useDeviceReady();
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
      {ready ? <Session deck={deck} lang={lang} /> : null}
    </main>
  );
}

function Session({ deck, lang }: { deck: DeckSize | null; lang: string | null }) {
  const t = useT();
  const srs = useSrs();
  const saved = useSaved();
  // The cards of this sitting are fixed when it starts; answering one must not reshuffle the rest.
  const [start] = useState(() => {
    const now = Date.now();
    const state = sittingState(parseSrs(readRaw(SRS_KEY)), parseSaved(readRaw(SAVED_KEY)), deck && lang ? { lang, size: deck } : null, now);
    const ids = buildSession(Object.values(state.cards), now, deck && lang ? { only: (id) => inDeck(id, lang, deck) } : {});
    return { state, ids };
  });
  const ids = start.ids;
  // The cards it drew on are written once it is on screen, before the first answer can be given.
  useEffect(() => { saveSrs(start.state); }, [start]);
  const [phrases, setPhrases] = useState<Record<string, Phrase[]>>({});
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);

  // The decks this sitting draws on, fetched once each.
  const langs = useMemo(() => [...new Set(ids.map((id) => parseDeckCardId(id)?.lang).filter((l): l is string => !!l))], [ids]);
  useEffect(() => {
    let live = true;
    for (const l of langs) void loadDeck(l).then((p) => { if (live) setPhrases((cur) => ({ ...cur, [l]: p })); });
    return () => { live = false; stopSpeaking(); };
  }, [langs]);

  const faceOf = useCallback((id: string): Face | null => {
    const d = parseDeckCardId(id);
    if (d) {
      const p = phrases[d.lang]?.[d.index];
      return p ? { front: p.t, back: p.en, hint: p.ph, lang: d.lang } : null;
    }
    const w = saved[id];
    return w ? { front: w.word, back: w.meaning, lang: w.lang, book: w.book } : null;
  }, [phrases, saved]);

  const id = ids[at];
  const card = id ? srs.cards[id] : undefined;
  const face = id ? faceOf(id) : null;
  const finished = at >= ids.length;

  const reveal = useCallback(() => setShown(true), []);
  const grade = useCallback((g: Grade) => {
    if (!id) return;
    answerCard(id, g);
    stopSpeaking();
    setDone((n) => n + 1);
    setShown(false);
    setAt((n) => n + 1);
  }, [id]);
  const say = useCallback((slow: boolean) => { if (face) speak(face.front, face.lang, slow ? 0.6 : 0.95); }, [face]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || !face || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!shown && (e.key === " " || e.key === "Enter")) { e.preventDefault(); reveal(); }
      else if (shown && e.key === "1") grade("again");
      else if (shown && e.key === "2") grade("good");
      else if (shown && e.key === "3") grade("easy");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, face, shown, reveal, grade]);

  const back = (
    <Link href="/recall" aria-label={t("cards.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
    </Link>
  );

  if (ids.length === 0 || finished) {
    const none = ids.length === 0;
    return (
      <>
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood={none ? "sleepy" : "cheer"} className="block h-[150px] w-auto" />
          <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em]">{none ? t("cards.dueNone") : t("cards.done")}</h1>
          <p className="mt-2 max-w-[18rem] text-[15px] leading-snug text-muted">
            {none ? t("cards.empty") : t("cards.doneSub", { n: done })}
          </p>
        </div>
        <Link href={none ? "/library" : "/recall"} className="btn-cyan flex h-14 items-center justify-center rounded-full text-[16px] font-bold">
          {none ? t("cards.toLibrary") : t("cards.back")}
        </Link>
      </>
    );
  }

  const pct = Math.round((at / ids.length) * 100);
  const langName = LANGUAGES.find((l) => l.code === face?.lang)?.native ?? "";
  return (
    <>
      <div className="flex items-center gap-3">
        {back}
        <div role="progressbar" aria-valuemin={0} aria-valuemax={ids.length} aria-valuenow={at} aria-label={t("cards.progress", { done: at, total: ids.length })} className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-12 text-end text-[13px] font-semibold tabular-nums text-muted">{at + 1}/{ids.length}</span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        <div className="rounded-[28px] border border-border bg-surface px-6 py-10 text-center shadow-[0_10px_30px_-18px_rgba(14,116,144,.5)]">
          {face ? (
            <>
              <p lang={face.lang} dir="auto" className="font-reading text-[34px] font-bold leading-tight tracking-[-0.015em]">{face.front}</p>
              {face.hint ? <p className="mt-2 text-[15px] text-muted" dir="ltr">{face.hint}</p> : null}
              {canSpeak() ? (
                <div className="mt-5 flex justify-center gap-2">
                  <button type="button" onClick={() => say(false)} aria-label={`${t("reader.listenPage")}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-[14px] font-semibold text-accent active:bg-border/60">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
                    {langName}
                  </button>
                  <button type="button" onClick={() => say(true)} aria-label="0.6×" className="inline-flex h-11 items-center rounded-full border border-border px-4 text-[14px] font-semibold text-muted active:bg-border/60">0.6×</button>
                </div>
              ) : null}
              <div className="mt-6 min-h-[3.5rem] border-t border-border pt-5">
                {shown ? (
                  <>
                    <p dir="auto" className="text-[22px] font-semibold leading-snug">{face.back}</p>
                    {face.book ? <p className="mt-1.5 text-[13px] text-muted">{t("cards.fromBook", { book: face.book })}</p> : null}
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-muted" aria-live="polite">…</p>
          )}
        </div>
      </div>

      {shown && card ? (
        <div className="grid grid-cols-3 gap-2.5">
          {GRADES.map((g) => (
            <button key={g.grade} type="button" onClick={() => grade(g.grade)} className={`flex h-16 flex-col items-center justify-center rounded-2xl border-2 text-[16px] font-bold ${g.tone}`}>
              {t(g.label)}
              <span className="text-[11.5px] font-medium opacity-70">{g.grade === "again" ? "10 min" : `${Math.max(1, previewDays(card, g.grade))} d`}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={reveal} disabled={!face} className="btn-cyan h-14 rounded-full text-[16px] font-bold disabled:opacity-50">{t("cards.show")}</button>
      )}
    </>
  );
}

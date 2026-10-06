"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { loadDeck, parseDeckCardId, type DeckSize, type Phrase } from "@/lib/decks";
import { loadBookDeck, parseBookCardId, type BookLevel, type BookPhrase } from "@/lib/decks/books";
import { loadTopics, parseTopicCardId, type TopicId } from "@/lib/decks/topics";
import { useBookText, useLocale, useT } from "@/lib/i18n/react";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { Meaning } from "./Meaning";
import { canSpeak, speak, stopSpeaking } from "@/lib/reading/speak";
import { previewDays, type Grade } from "@/lib/srs/schedule";
import { buildSession, inBookDeck, inDeck, inTopic } from "@/lib/srs/session";
import { answerCard, parseSrs, saveSrs, sittingState, SRS_KEY } from "@/lib/srs/store";
import { useDeviceReady, useSaved, useSrs } from "@/lib/srs/use";
import { readRaw } from "@/lib/store/local";
import { SAVED_KEY, parseSaved, wordsOfBook } from "@/lib/words/saved";
import { LevelUp } from "@/components/xp/LevelUp";
import { levelUpBetween, xpForCard, type LevelUp as LevelUpInfo } from "@/lib/xp/levels";
import { awardCard, currentXp } from "@/lib/xp/ledger";

/** "10 min" or "3 d" in the reader's language. */
function unitText(locale: string, unit: "minute" | "day", n: number): string {
  try { return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "narrow" }).format(n); }
  catch { return `${n} ${unit === "minute" ? "min" : "d"}`; }
}

/** What a card shows: the word or phrase, and what it means. */
interface Face { front: string; back: string; hint?: string; lang: string; book?: string; /** The back is an English deck meaning, which can be shown in the reader's language. */ deck?: boolean }

const GRADES: readonly { grade: Grade; label: "cards.again" | "cards.good" | "cards.easy"; tone: string }[] = [
  { grade: "again", label: "cards.again", tone: "border-rose-300 bg-rose-50 text-rose-700 active:bg-rose-100" },
  { grade: "good", label: "cards.good", tone: "border-accent-bright bg-accent-bright/20 text-accent active:bg-accent-bright/35" },
  { grade: "easy", label: "cards.easy", tone: "border-emerald-300 bg-emerald-50 text-emerald-700 active:bg-emerald-100" },
];

export interface BookDeckRef { slug: string; title: string; lang: string; level: BookLevel; size: number }
/**
 * One sitting of flashcards. `deck` narrows it to the first 50 or 100 phrases of `lang`'s deck; with no
 * deck it is everything due: the saved words and the phrases of any deck that was started. `book` is every
 * word saved from one book (owner, 6 Oct 2026), due or not, from that book's page. `bookDeck` is the phrases of one book (owner,
 * 7 Oct 2026), a few new ones at a time in the order of the story.
 */
export function Flashcards({ deck, lang, topic = null, book = null, bookDeck = null }: { deck: DeckSize | null; lang: string | null; /** One topic deck of `lang`, instead of a phrase deck. */ topic?: TopicId | null; /** Every saved word of one book. */ book?: { slug: string; title: string } | null; /** The phrases of one book. */ bookDeck?: BookDeckRef | null }) {
  const ready = useDeviceReady();
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
      {ready ? <Session deck={deck} lang={lang} topic={topic} book={book} bookDeck={bookDeck} /> : null}
    </main>
  );
}

function Session({ deck, lang, topic, book, bookDeck }: { deck: DeckSize | null; lang: string | null; topic: TopicId | null; book: { slug: string; title: string } | null; bookDeck: BookDeckRef | null }) {
  const t = useT();
  const bookText = useBookText();
  const bookTitle = book ? bookText(book.slug, "title", book.title) : "";
  const deckTitle = bookDeck ? bookText(bookDeck.slug, "title", bookDeck.title) : "";
  // The line above the card for a book's words or a book's phrases.
  const sitting = book ? t("book.words.sitting", { book: bookTitle }) : bookDeck ? t("book.phrases.sitting", { book: deckTitle }) : null;
  const locale = useLocale();
  const a = useAnswers();
  const srs = useSrs();
  const saved = useSaved();
  // The cards of this sitting are fixed when it starts; answering one must not reshuffle the rest.
  const [start] = useState(() => {
    const now = Date.now();
    const savedNow = parseSaved(readRaw(SAVED_KEY));
    const state = sittingState(parseSrs(readRaw(SRS_KEY)), savedNow, deck && lang ? { lang, size: deck } : null, now, topic && lang ? { lang, topic } : null, bookDeck);
    // A book's words: every one saved from it (older ones by title), due or not.
    const mine = book ? new Set(wordsOfBook(savedNow, book.slug, [book.title, bookTitle])) : null;
    const ids = buildSession(Object.values(state.cards), now, mine ? { only: (id) => mine.has(id), all: true } : bookDeck ? { only: (id) => inBookDeck(id, bookDeck.slug, bookDeck.lang) } : topic && lang ? { only: (id) => inTopic(id, lang, topic) } : deck && lang ? { only: (id) => inDeck(id, lang, deck) } : {});
    return { state, ids };
  });
  const ids = start.ids;
  // The cards it drew on are written once it is on screen, before the first answer can be given.
  useEffect(() => { saveSrs(start.state); }, [start]);
  const [phrases, setPhrases] = useState<Record<string, Phrase[]>>({});
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  // What the last right answer paid, shown for a moment; and a new stage or level, celebrated.
  const [gain, setGain] = useState<{ n: number; xp: number } | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);
  useEffect(() => {
    if (!gain) return;
    const timer = window.setTimeout(() => setGain(null), 1200);
    return () => window.clearTimeout(timer);
  }, [gain]);

  // The decks this sitting draws on, fetched once each.
  const langs = useMemo(() => [...new Set(ids.map((id) => parseDeckCardId(id)?.lang).filter((l): l is string => !!l))], [ids]);
  const topicLangs = useMemo(() => [...new Set(ids.map((id) => parseTopicCardId(id)?.lang).filter((l): l is string => !!l))], [ids]);
  const [topics, setTopics] = useState<Record<string, Partial<Record<TopicId, Phrase[]>>>>({});
  const [bookPhrases, setBookPhrases] = useState<Record<string, BookPhrase[]>>({});
  const bookKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const cardId of ids) {
      const d = parseBookCardId(cardId);
      if (d) keys.add(`${d.slug}:${d.lang}:${d.level}`);
    }
    return [...keys];
  }, [ids]);
  useEffect(() => {
    let live = true;
    for (const l of langs) void loadDeck(l).then((p) => { if (live) setPhrases((cur) => ({ ...cur, [l]: p })); });
    for (const l of topicLangs) void loadTopics(l).then((p) => { if (live) setTopics((cur) => ({ ...cur, [l]: p })); });
    for (const k of bookKeys) {
      const [slug, l, level] = k.split(":");
      void loadBookDeck(slug, l, level as BookLevel).then((p) => { if (live) setBookPhrases((cur) => ({ ...cur, [k]: p })); });
    }
    return () => { live = false; stopSpeaking(); };
  }, [langs, topicLangs, bookKeys]);

  const faceOf = useCallback((id: string): Face | null => {
    const bk = parseBookCardId(id);
    if (bk) {
      const p = bookPhrases[`${bk.slug}:${bk.lang}:${bk.level}`]?.[bk.index];
      return p ? { front: p.t, back: p.en, hint: p.ph, lang: bk.lang, deck: true } : null;
    }
    const tp = parseTopicCardId(id);
    if (tp) {
      const p = topics[tp.lang]?.[tp.topic]?.[tp.index];
      return p ? { front: p.t, back: p.en, hint: p.ph, lang: tp.lang, deck: true } : null;
    }
    const d = parseDeckCardId(id);
    if (d) {
      const p = phrases[d.lang]?.[d.index];
      return p ? { front: p.t, back: p.en, hint: p.ph, lang: d.lang, deck: true } : null;
    }
    const w = saved[id];
    // A word saved with no meaning still gets a back, so the reader is never asked to grade a blank.
    return w ? { front: w.word, back: w.meaning || t("cards.noMeaning"), lang: w.lang, book: w.book } : null;
  }, [phrases, topics, bookPhrases, saved, t]);

  const id = ids[at];
  const card = id ? srs.cards[id] : undefined;
  const face = id ? faceOf(id) : null;
  const finished = at >= ids.length;

  const reveal = useCallback(() => setShown(true), []);
  const grade = useCallback((g: Grade) => {
    if (!id) return;
    answerCard(id, g);
    // A card known pays XP (more than reading does); one that was not known ("Again") pays nothing.
    const before = currentXp();
    const xp = awardCard(g);
    if (xp > 0) {
      setGain({ n: Date.now(), xp });
      const up = levelUpBetween(before, currentXp());
      if (up) setLevelUp(up);
    }
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
    <Link href={book ? `/book/${book.slug}` : bookDeck ? `/book/${bookDeck.slug}` : "/recall"} aria-label={t("cards.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
    </Link>
  );

  if (ids.length === 0 || finished) {
    const none = ids.length === 0;
    // Nobody has ever had a card: point at the phrase decks, not "nothing due".
    const fresh = none && Object.keys(start.state.cards).length === 0;
    const deckLang = lang ?? a.learn;
    return (
      <>
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood={none ? "sleepy" : "cheer"} className="block h-[150px] w-auto" />
          <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em]">{none ? t(fresh ? "cards.noneYet" : "cards.dueNone") : t("cards.done")}</h1>
          <p className="mt-2 max-w-[18rem] text-[15px] leading-snug text-muted">
            {none ? t("cards.empty") : t("cards.doneSub", { n: done })}
          </p>
        </div>
        {fresh && deckLang ? (
          <Link href={`/recall/flashcards?deck=50&lang=${deckLang}`} className="btn-cyan flex h-14 items-center justify-center rounded-full text-[16px] font-bold">{t("recall.deck50")}</Link>
        ) : null}
        {deckLang ? <Link href="/recall/decks" className="mt-1 flex h-12 items-center justify-center text-[15px] font-semibold text-[var(--ob-deep)]">{t("recall.decks.choose")}</Link> : null}
        <Link href={none ? "/library" : "/recall"} className={fresh && deckLang ? "mt-1 flex h-12 items-center justify-center text-[15px] font-semibold text-[var(--ob-deep)]" : "btn-cyan flex h-14 items-center justify-center rounded-full text-[16px] font-bold"}>
          {none ? t("cards.toLibrary") : t("cards.back")}
        </Link>
        {levelUp && <LevelUp up={levelUp} onClose={() => setLevelUp(null)} />}
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

      {sitting ? <p className="mt-3 text-center text-[13px] font-semibold text-muted"><bdi>{sitting}</bdi></p> : null}
      <div className="relative flex flex-1 flex-col justify-center py-6">
        {gain && (
          <p key={gain.n} className="xp-pop tabular pointer-events-none absolute inset-x-0 top-1 mx-auto w-fit rounded-full bg-accent-bright px-3.5 py-1 text-[14px] font-bold text-on-cyan shadow-md" role="status">
            <bdi>{t("reader.xp", { xp: gain.xp })}</bdi>
          </p>
        )}
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
                    <p dir="auto" className="text-[22px] font-semibold leading-snug">{face.deck ? <Meaning text={face.back} /> : face.back}</p>
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
              <span className="text-[11.5px] font-medium opacity-70">{g.grade === "again" ? unitText(locale, "minute", 10) : unitText(locale, "day", Math.max(1, previewDays(card, g.grade)))}{g.grade === "again" ? "" : ` · +${xpForCard(g.grade)} XP`}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={reveal} disabled={!face} className="btn-cyan h-14 rounded-full text-[16px] font-bold disabled:opacity-50">{t("cards.show")}</button>
      )}
      {levelUp && <LevelUp up={levelUp} onClose={() => setLevelUp(null)} />}
    </>
  );
}

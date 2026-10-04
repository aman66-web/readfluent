"use client";

import { usePageKeys } from "@/components/reader/usePageKeys";
import { keySpans } from "@/lib/reading/keys";
import type { WordEntry } from "@/lib/preview/spanish";
import { useSentenceMeaning } from "@/components/reader/useSentenceMeaning";
import { BackLink } from "@/components/BackLink";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ObjectPhoto } from "@/components/ObjectPhoto";
import { ScenePhoto } from "@/components/ScenePhoto";
import { Mascot } from "@/components/mascot/Mascot";
import { Settings } from "@/components/reader/Settings";
import { WordCard } from "@/components/reader/WordCard";
import { WordsSheet } from "@/components/reader/WordsSheet";
import type { ReaderPage, ReaderVariant } from "@/components/reader/types";
import { useTranslated } from "@/components/reader/useTranslated";
import { languageName } from "@/lib/i18n";
import { useBookText, useLocale, useT } from "@/lib/i18n/react";
import { ANSWERS_KEY, parseAnswers } from "@/lib/onboarding/answers";
import { readPage, resumeIndex, savePage, versionKey } from "@/lib/progress";
import { READER_PREFS_KEY, TEXT_SIZES, parsePrefs } from "@/lib/reading/prefs";
import { canSpeak, speak, stopSpeaking } from "@/lib/reading/speak";
import { tokenize, translatedLine } from "@/lib/reading/sentences";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { SAVED_KEY, parseSaved, removeSaved, savedId, toggleSaved } from "@/lib/words/saved";
import { XP, levelUpBetween, type LevelUp as LevelUpInfo } from "@/lib/xp/levels";
import { LevelUp } from "@/components/xp/LevelUp";
import { LEDGER_KEY, awardFinish, awardPage, currentXp, parseLedger, trackSeconds } from "@/lib/xp/ledger";
import type { Scene } from "@/lib/preview/catalog";

/** Photos are mounted only for the current page and its neighbours (SPEC.md §10, M4): a 200-page version never holds 200 images. */
const KEEP_PHOTOS = 2;

/** How tall the photo is, in screen heights: the longer the page of text at a level, the less room the photo takes. */
const PHOTO_DVH: Record<string, number> = { A1A2: 38, B1B2: 33, C1C2: 27 };

interface Props {
  slug: string;
  title: string;
  levelId: string;
  levelLabel: string;
  length: number;
  /** The book in each language it has here, the first being the default. */
  variants: ReaderVariant[];
  scenes: Scene[];
  /** The book can be translated into any language on demand (a book of the library); the preview sample cannot. */
  translatable?: boolean;
}

const subscribeAnswers = subscribeTo(ANSWERS_KEY);
const readAnswers = () => readRaw(ANSWERS_KEY);
const subscribeSaved = subscribeTo(SAVED_KEY);
const readSaved = () => readRaw(SAVED_KEY);
const subscribePrefs = subscribeTo(READER_PREFS_KEY);
const readPrefsRaw = () => readRaw(READER_PREFS_KEY);
const subscribeLedger = subscribeTo(LEDGER_KEY);
const readLedgerRaw = () => readRaw(LEDGER_KEY);
const serverRaw = () => "";
const noSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** No activity for this long and the reader is taken to have put the phone down. */
const IDLE_MS = 60_000;

/**
 * Which language of the book to open: the one the reader is learning, if the book has it, and
 * the first one otherwise. Where there is more than one, a chip on the photo switches (a preview
 * feature; the real app has one language per version).
 */
export function Reader(props: Props) {
  const raw = useSyncExternalStore(subscribeAnswers, readAnswers, serverRaw);
  // Which language to open is known only on the device. Where there is a choice, wait for it
  // instead of mounting the first language and throwing it away a moment later.
  const ready = useSyncExternalStore(noSubscribe, onClient, onServer);
  const answers = useMemo(() => parseAnswers(raw), [raw]);
  const learn = answers.learn;
  const t = useT();
  const locale = useLocale();
  // A language the book has no file for is made by the machine translator, the first time somebody opens it.
  const wanted = ready && props.translatable && learn && learn !== "en" && !props.variants.some((v) => v.lang === learn) ? learn : null;
  const english = useMemo(() => (props.variants[0]?.lang === "en" ? props.variants[0].pages.map((p) => p.text) : null), [props.variants]);
  const made = useTranslated(wanted, answers.language, props.slug, props.levelId, props.length, english);
  const variants = made.variant ? [...props.variants, made.variant] : props.variants;
  const preferred = Math.max(0, variants.findIndex((v) => v.lang === learn));
  const [picked, setPicked] = useState<number | null>(null);
  // "Read chapter 1 now" on the download screen: the book opens with chapter 1 in the language and the rest in English.
  const [startFirst, setStartFirst] = useState(false);
  const vi = picked ?? preferred;
  const many = variants.length > 1;
  if (!ready && (many || props.translatable)) return <div className="h-dvh" aria-busy="true" />;
  if (wanted && made.state === "download" && !(startFirst && made.variant)) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-5 px-8 text-center" role="status">
        <Mascot mood="reading" className="w-[132px]" />
        <p className="text-[17px] font-semibold leading-snug">{t("reader.downloadLang", { language: languageName(wanted, locale) })}</p>
        <p className="text-[14px] leading-snug text-muted">{t("reader.downloadLangNote", { language: languageName(wanted, locale) })}</p>
        <button type="button" onClick={made.download} className="btn-cyan inline-flex h-12 items-center rounded-full px-7 text-[15px] font-bold">
          {t("reader.downloadLangButton", { language: languageName(wanted, locale) })}
        </button>
        {made.variant && (
          <button type="button" onClick={() => setStartFirst(true)} className="min-h-11 px-4 text-[15px] font-semibold text-accent underline underline-offset-4">
            {t("reader.startNow")}
          </button>
        )}
      </div>
    );
  }
  const notice = wanted && (made.state === "loading" || made.state === "working") ? t("reader.translating", { language: languageName(wanted, locale) })
    : wanted && (made.state === "partial" || made.state === "download") ? t("reader.startOnly", { language: languageName(wanted, locale) })
    : wanted && made.state === "off" ? t("reader.notYet", { language: languageName(wanted, locale) })
    : wanted && made.state === "failed" ? t("reader.translateFailed", { language: languageName(wanted, locale) })
    : undefined;
  // Keyed by the language, so switching starts a fresh reader on page one.
  return <ReaderView key={`${vi}-${variants[vi].lang}`} {...props} variant={variants[vi]} notice={notice} onSwitch={many ? () => setPicked((vi + 1) % variants.length) : undefined} />;
}

/**
 * Reading a version, one page at a time, swipe-through: a photo, a few lines, the page number and
 * a progress bar (SPEC.md §3). Native scroll-snap does the swiping, so it feels like the phone's
 * own and costs no gesture code; the buttons and arrow keys drive the same scroller. Where the
 * reader got to is kept on the device and picked up again.
 *
 * Where the version has word cards, every word of the text can be tapped: the English (or the
 * reader's own language) for that sentence appears at the top, with the matched words in the
 * same colour as in the text, and the word card rises at the bottom.
 */
function ReaderView({ slug, title, levelId, levelLabel, length, variant, scenes, notice, onSwitch }: Props & { variant: ReaderVariant; notice?: string; onSwitch?: () => void }) {
  const t = useT();
  // Whether this device can read aloud is only known in the browser; the server draws no Listen button, and so must the first client render.
  const speakable = useSyncExternalStore(noSubscribe, canSpeak, () => false);
  const locale = useLocale();
  const bookText = useBookText();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pages = usePageKeys(variant.pages, index, variant.lang);
  const total = pages.length;
  const onEnd = index >= total;
  const interactive = !!variant.dict;
  // Whatever language it is read in, it is one version of the book: progress and XP are kept under the same key.
  const progressSlug = slug;

  // Where a smooth scroll is heading, so two quick presses of Next go two pages, not one.
  const heading = useRef<number | null>(null);
  const headingTimer = useRef(0);
  // The page the scroller last settled on, kept here so the scroll handler can tell a change from a repeat.
  const shown = useRef(0);
  const goTo = useCallback((i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.min(Math.max(0, i), total);
    heading.current = clamped;
    window.clearTimeout(headingTimer.current);
    headingTimer.current = window.setTimeout(() => { heading.current = null; }, 700);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
  }, [total]);
  const step = useCallback((by: number) => goTo((heading.current ?? shown.current) + by), [goTo]);

  // ── word taps ──
  const [sel, setSel] = useState<{ page: number; word: string; start: number; /** Set for a phrase that means something only as a whole: where it ends. */ end?: number } | null>(null);
  const [slow, setSlow] = useState(false);
  const [toast, setToast] = useState<{ text: string; happy: boolean } | null>(null);
  const prefsRaw = useSyncExternalStore(subscribePrefs, readPrefsRaw, serverRaw);
  const prefs = useMemo(() => parsePrefs(prefsRaw), [prefsRaw]);
  const [menu, setMenu] = useState(false);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [hop, setHop] = useState(0);
  const savedRaw = useSyncExternalStore(subscribeSaved, readSaved, serverRaw);
  const saved = useMemo(() => parseSaved(savedRaw), [savedRaw]);
  const say = useCallback((text: string, happy = false) => {
    setToast({ text, happy });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => () => stopSpeaking(), []);
  const [reading, setReading] = useState(false);

  // A tap on a word that belongs to a phrase (a match of several words) takes the whole phrase: it has one meaning.
  const pick = (page: number, word: string, start: number) => {
    setMenu(false);
    const p = pages[page];
    const ks = p?.target?.keys ?? [];
    const spans = p ? keySpans(p.text, ks, "w") : new Map<number, number>();
    const k = spans.get(start);
    if (p && k !== undefined && /\s/.test(ks[k].w.trim())) {
      const toks = tokenize(p.text).filter((t) => t.word);
      const at = toks.findIndex((t) => t.start === start);
      let l = at, r = at;
      while (l > 0 && spans.get(toks[l - 1].start) === k) l--;
      while (r + 1 < toks.length && spans.get(toks[r + 1].start) === k) r++;
      const from = toks[l].start, to = toks[r].start + toks[r].text.length;
      setSel({ page, word: p.text.slice(from, to).toLowerCase(), start: from, end: to });
      return;
    }
    setSel({ page, word, start });
  };
  const selPage = sel ? pages[sel.page] : undefined;
  const keys = selPage?.target?.keys ?? [];
  const keyIx = sel && selPage ? (keySpans(selPage.text, keys, "w").get(sel.start) ?? -1) : -1;
  const colour = keyIx >= 0 ? `var(--key-${(keyIx % 3) + 1})` : "var(--foreground)";
  // A phrase has no dictionary entry: its meaning is the English it was matched to.
  const cardEntry = sel ? (sel.end !== undefined && keyIx >= 0 ? { en: keys[keyIx].en, use: "" } : variant.dict?.[sel.word]) : undefined;
  // A card made by hand explains the word; one made by the translator from the word alone is a guess, so the word is asked again in its sentence.
  const inSentence = useSentenceMeaning(sel && !cardEntry?.use && selPage ? { text: selPage.text, start: sel.start, word: sel.word } : null, variant.lang, locale);
  const entry: WordEntry | undefined = inSentence.text ? { en: inSentence.text, use: "" } : inSentence.pending ? { en: "…", use: "" } : cardEntry;
  const open = sel !== null;
  // The lines are in English until the translation pipeline gives each reader their own language.
  const lineLang = languageName("en", locale);

  // The whole page read aloud with the phone's own voice; a tap again stops it.
  const readPageAloud = () => {
    if (reading) { stopSpeaking(); setReading(false); return; }
    const text = pages[index]?.text;
    if (!text) return;
    setSel(null);
    if (speak(text, variant.lang, slow ? 0.6 : 0.92, () => say(t("reader.noAudio", { language: languageName(variant.lang, locale) })), () => setReading(false))) setReading(true);
    else say(t("reader.noAudio", { language: languageName(variant.lang, locale) }));
  };

  const hear = (rate: number) => {
    if (sel && !speak(sel.word, variant.lang, rate, () => say(t("reader.noAudio", { language: languageName(variant.lang, locale) })))) say(t("reader.noAudio", { language: languageName(variant.lang, locale) }));
  };

  // Pick up where the reader left off. After mount, because the server has no
  // device storage and the first render has to match it.
  useEffect(() => {
    // The scroll this causes is what updates `index` (see the scroll handler).
    const start = resumeIndex(readPage(progressSlug, levelId, length), total);
    if (start > 0) goTo(start, false);
  }, [progressSlug, levelId, length, total, goTo]);

  // Which page the scroller is showing, as it moves.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        if (heading.current === i) heading.current = null;
        if (shown.current !== i) {
          // A word card belongs to the page it was opened on.
          shown.current = i;
          setIndex(i);
          setSel(null);
          stopSpeaking();
        }
        // Remembered as the reader moves — never the "end" slide, so reopening
        // resumes on the last page. Saved here, not in an effect, so opening a
        // version never overwrites where the reader had got to.
        if (total > 0) savePage(progressSlug, levelId, length, Math.min(i, total - 1));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [progressSlug, levelId, length, total]);

  // Focus follows the sheet: in when it opens, back on the button that opened it when it closes.
  const wordsChip = useRef<HTMLButtonElement>(null);
  const closeWords = useCallback(() => {
    setWordsOpen(false);
    window.setTimeout(() => wordsChip.current?.focus(), 0);
  }, []);

  const settingsToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Browser shortcuts (Alt+← is "back") and keys another control already used are not ours.
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
      if (e.key === "Escape") {
        // One layer at a time: the sheet, then the menu, then the card.
        if (wordsOpen) closeWords();
        else if (menu) { setMenu(false); settingsToggle.current?.focus(); }
        else setSel(null);
        return;
      }
      if (wordsOpen || menu) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, wordsOpen, menu, closeWords]);

  // The Aa menu is a popover: a tap anywhere else puts it away.
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest("[data-settings], [data-settings-toggle]")) setMenu(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [menu]);

  // A tapped word may sit where the card is about to rise: bring it back into view.
  useEffect(() => {
    if (!sel) return;
    const id = window.setTimeout(() => {
      scroller.current?.querySelector<HTMLElement>("[data-sel]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, 240);
    return () => window.clearTimeout(id);
  }, [sel]);

  // XP: a page pays once it has been on screen for a moment, finishing pays once, and the
  // time spent feeds the dashboard's graph. All of it is kept on the device (lib/xp).
  const version = versionKey(progressSlug, levelId, length);
  const [gain, setGain] = useState<{ xp: number; finish: boolean; n: number } | null>(null);
  const flash = useCallback((xp: number, finish: boolean) => {
    setGain((g) => ({ xp, finish, n: (g?.n ?? 0) + 1 }));
  }, []);
  useEffect(() => {
    if (!gain) return;
    const id = window.setTimeout(() => setGain(null), 1600);
    return () => window.clearTimeout(id);
  }, [gain]);
  // A new stage or a new level: the celebration comes up over the page.
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);
  useEffect(() => {
    if (total === 0 || index >= total) return;
    const id = window.setTimeout(() => {
      const before = currentXp();
      const xp = awardPage(version, index + 1, levelId);
      if (xp > 0) {
        flash(xp, false);
        const up = levelUpBetween(before, currentXp());
        if (up) setLevelUp(up);
      }
    }, XP.dwellMs);
    return () => window.clearTimeout(id);
  }, [index, total, version, levelId, flash]);
  useEffect(() => {
    if (!onEnd || total === 0) return;
    // After the end slide has settled, not in the same breath as arriving on it.
    const id = window.setTimeout(() => {
      const before = currentXp();
      const xp = awardFinish(version, total);
      if (xp > 0) {
        flash(xp, true);
        const up = levelUpBetween(before, currentXp());
        if (up) setLevelUp(up);
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [onEnd, total, version, flash]);
  // Reading time counts only while someone is reading: not on the last slide, and not once
  // there has been no touch, key or scroll for a minute.
  const lastActive = useRef(0);
  useEffect(() => {
    const mark = () => { lastActive.current = Date.now(); };
    mark();
    const events = ["pointerdown", "keydown", "touchmove", "scroll"] as const;
    for (const ev of events) window.addEventListener(ev, mark, { passive: true, capture: true });
    return () => { for (const ev of events) window.removeEventListener(ev, mark, { capture: true }); };
  }, []);
  useEffect(() => {
    if (onEnd) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastActive.current < IDLE_MS) trackSeconds(slug, 5);
    }, 5000);
    return () => window.clearInterval(id);
  }, [slug, onEnd]);

  // The end slide reports what the ledger says, not what happened to be earned in this visit.
  const ledgerRaw = useSyncExternalStore(subscribeLedger, readLedgerRaw, serverRaw);
  const ledger = useMemo(() => parseLedger(ledgerRaw), [ledgerRaw]);
  const savedHere = useMemo(() => Object.values(saved).filter((w) => w.book === title && w.lang === variant.lang).length, [saved, title, variant.lang]);

  const progress = onEnd ? 100 : Math.round(((index + 1) / total) * 100);
  const isPreview = length > total;
  const sub = [onEnd ? t("reader.done") : t("reader.pageLabel", { n: index + 1, total }), levelLabel, languageName(variant.lang, locale)].join(" · ");

  // The photo is six wide by five tall, as wide as the column allows, and shorter while a word card is open so the text keeps room.
  // On short phones the longer levels give the photo up to 120px so their text fits.
  const room = levelId === "C1C2" ? 520 : levelId === "B1B2" ? 480 : 0;
  const base = `min(${open ? 22 : PHOTO_DVH[levelId] ?? 38}dvh, calc((min(100vw, 440px) - 36px) / 1.2)${room ? `, calc(100dvh - ${room}px)` : ""})`;
  const photoH = room ? `max(120px, ${base})` : base;

  return (
    <div className="relative flex h-dvh flex-col">
      <header className="safe-top shrink-0 px-4 [--pt:.5rem]" inert={wordsOpen}>
        <div className="flex h-11 items-center gap-1">
          <BackLink fallback={`/book/${slug}`} label={t("reader.backBook")} className="-ms-2 flex size-11 shrink-0 items-center justify-center rounded-full active:bg-border/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
          </BackLink>
          <div className="min-w-0 flex-1">
            <h1 lang={locale} className="truncate text-[11.5px] font-semibold uppercase tracking-[0.09em] text-muted">{bookText(slug, "title", title)}</h1>
            <p className="truncate text-[12px] text-muted" aria-live="polite">{sub}</p>
          </div>
          {interactive && Object.keys(saved).length > 0 && (
            <button ref={wordsChip} type="button" onClick={() => { setWordsOpen(true); setMenu(false); }} aria-label={t("reader.yourWords")}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-accent-bright/25 ps-2 pe-2.5 text-[13px] font-bold tabular">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" /></svg>
              {Object.keys(saved).length}
            </button>
          )}
          {speakable && (
            <button type="button" data-tour="listen" aria-pressed={reading} aria-label={reading ? t("reader.stopListening") : t("reader.listenPage")} onClick={readPageAloud}
                    className={`grid size-11 shrink-0 place-items-center rounded-full ${reading ? "bg-accent-bright/25 text-foreground" : "text-muted active:bg-border/60"}`}>
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {reading ? <rect x="7" y="7" width="10" height="10" rx="2" /> : <path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
              </svg>
            </button>
          )}
          {(
            <button ref={settingsToggle} type="button" dir="ltr" data-tour="settings" data-settings-toggle aria-expanded={menu} aria-label={t("reader.settings")} onClick={() => setMenu(!menu)}
                    className={`flex size-11 shrink-0 items-baseline justify-center rounded-full pt-[11px] text-[17px] font-bold tracking-[-0.02em] ${menu ? "bg-accent-bright/25" : "active:bg-border/60"}`}>
              A<span className="text-[12px]">A</span>
            </button>
          )}
          {interactive && (
            <button type="button" aria-pressed={slow} aria-label={t("reader.slowAudio")}
                    onClick={() => { setSlow(!slow); say(slow ? t("reader.slowOff") : t("reader.slowOn")); }}
                    className={`grid size-11 shrink-0 place-items-center rounded-full ${slow ? "bg-accent-bright/25 text-foreground" : "text-muted active:bg-border/60"}`}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4.5 16C4.5 11.8 7.7 8.5 11.5 8.5S18.5 11.8 18.5 16z" /><path d="M11.5 8.8V16M7.8 11.3l1.5 4.7M15.2 11.3l-1.5 4.7" strokeWidth="1.25" />
                <circle cx="20.9" cy="13.9" r="1.7" /><path d="M18.6 14.9l1 -.5M8 16v2.3M15 16v2.3M4.5 16L3 17.2" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-border" role="progressbar" dir="ltr" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={t("reader.progress")}>
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        {notice && index === 0 && <p role="status" className="mt-2 rounded-xl bg-accent-bright/20 px-3 py-2 text-[12.5px] font-semibold leading-snug text-[var(--ob-deep)]">{notice}</p>}
      </header>

      {menu && <Settings prefs={prefs} language={lineLang} interactive={interactive} />}

      {/* What the line you tapped says in the reader's own language. */}
      {sel && selPage?.target && (
        <div className="line-down mt-2 shrink-0 border-y border-border bg-surface px-4 pb-2 pt-1.5">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">{t("reader.lineIn", { language: lineLang })}</p>
          <p lang="en" dir="ltr" className="font-reading text-[16px] font-medium leading-[1.6]">
            <TranslatedLine line={translatedLine(selPage.text, selPage.target.translation, sel.start)} keys={keys} chosen={keyIx} />
          </p>
        </div>
      )}

      <div ref={scroller} data-tour="page" dir="ltr" className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain" aria-label={t("reader.pages")} inert={wordsOpen}>
        {pages.map((p, i) => {
          const near = Math.abs(i - index) <= KEEP_PHOTOS;
          const scene = scenes[p.scene - 1];
          return (
            <section key={p.n} inert={i !== index} className="flex h-full w-full shrink-0 snap-start flex-col overflow-hidden" aria-roledescription="page" aria-label={t("reader.pageLabel", { n: p.n, total })}>
              <div className="flex shrink-0 justify-center px-[18px] pt-3" onClick={() => { if (open) setSel(null); setMenu(false); }}>
                <div className="relative aspect-[6/5] overflow-hidden rounded-[26px] border-[1.5px] border-border bg-surface transition-[height] duration-200" style={{ height: photoH }}>
                  {near ? (
                    p.target?.art
                      ? <ObjectPhoto art={p.target.art} bg={p.target.bg ?? ""} caption={scene?.caption ?? ""} className="h-full w-full" />
                      : <ScenePhoto caption={scene?.caption ?? ""} seed={`${slug}:${p.scene}`} pill={false} className="h-full w-full" />
                  ) : null}
                  <span className="absolute start-3 top-3 grid h-9 min-w-9 place-items-center rounded-full bg-black/80 px-3 text-[15px] font-bold text-white">{p.n}</span>
                  {onSwitch && i === index && !open && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); onSwitch(); }} aria-label={t("reader.switchLang")}
                            className="absolute end-3 top-3 flex h-8 items-center gap-1 rounded-full bg-white/90 ps-3 pe-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-[#0b1b22]">
                      {variant.lang}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-[22px] pb-3 pt-1.5">
                <div data-tour={interactive ? "text" : undefined} className="-mx-2 px-2">
                <PageText page={p} interactive={interactive} selected={sel && sel.page === i ? sel.start : -1} selectedEnd={sel && sel.page === i ? sel.end : undefined} lang={variant.lang}
                          size={TEXT_SIZES[prefs.size]} colours={prefs.colours} gloss={prefs.gloss && !open}
                          onPick={(word, start) => pick(i, word, start)} />
                </div>
              </div>
            </section>
          );
        })}

        <section inert={!onEnd} dir="auto" className="h-full w-full shrink-0 snap-start overflow-y-auto px-8 text-center" aria-label={t("reader.end")}>
          <div className="mx-auto my-auto flex min-h-full max-w-[340px] flex-col items-center justify-center py-4">
          <Mascot mood="cheer" className="w-[min(40vw,14dvh,150px)]" />
          <p className="mt-2 font-reading text-[26px] font-bold">{isPreview ? t("reader.endTitle") : t("reader.endTitleBook", { title: bookText(slug, "title", title) })}</p>
          <p className="mt-3 max-w-[30ch] text-[15px] leading-snug text-muted">
            {isPreview ? t("reader.endBodyPreview", { total, length }) : t("reader.endBody")}
          </p>
          <ul className="mt-5 grid w-full max-w-[320px] grid-cols-3 gap-2">
            {[
              { id: "reader.pagesRead" as const, value: Math.min(total, ledger.pages[version]?.length ?? 0) },
              { id: "reader.xpEarned" as const, value: ledger.earned },
              { id: "reader.wordsSaved" as const, value: savedHere },
            ].map((x) => (
              <li key={x.id} className="rounded-2xl border border-border bg-surface px-1.5 py-2.5">
                <span className="tabular block text-[20px] font-bold">{x.value.toLocaleString(locale)}</span>
                <span className="text-[11.5px] font-semibold leading-tight text-muted">{t(x.id)}</span>
              </li>
            ))}
          </ul>
          <BackLink fallback={`/book/${slug}`} className="mt-6 inline-flex h-12 shrink-0 items-center btn-cyan rounded-full px-7 text-[15px] font-bold">
            {t("reader.another")}
          </BackLink>
          <BackLink fallback="/" className="mt-3 inline-flex h-11 shrink-0 items-center text-[14px] font-semibold text-muted">{t("reader.toLibrary")}</BackLink>
          </div>
        </section>
      </div>

      <footer inert={wordsOpen} className={`safe-bottom relative shrink-0 px-5 ${open ? "rounded-t-[26px] border-t border-border bg-background [--pb:.75rem] pt-3 shadow-[0_-8px_28px_rgba(0,0,0,.08)]" : "[--pb:.75rem] pt-2"}`}>
        {gain && (
          <p key={gain.n} className="xp-pop tabular pointer-events-none absolute inset-x-0 -top-9 mx-auto w-fit rounded-full bg-accent-bright px-3 py-1 text-[13px] font-bold text-on-cyan shadow-md" role="status">
            <bdi>{gain.finish ? t("reader.finishXp", { xp: gain.xp }) : t("reader.xp", { xp: gain.xp })}</bdi>
          </p>
        )}
        {sel ? (
          <WordCard word={sel.word} entry={entry} colour={colour}
                    saved={savedId(variant.lang, sel.word) in saved}
                    onListen={() => hear(slow ? 0.7 : 0.95)} onSlow={() => hear(0.5)}
                    onSave={() => {
                      const now = toggleSaved({ word: sel.word, lang: variant.lang, meaning: (entry?.en !== "…" ? entry?.en : cardEntry?.en) ?? "", book: title });
                      say(now ? t("reader.savedToast") : t("reader.removedToast"), now);
                      if (now) setHop((h) => h + 1);
                    }}
                    onClose={() => setSel(null)} />
        ) : (
          <>
            <div dir="ltr" className="flex items-center justify-between gap-2">
              <button onClick={() => step(-1)} disabled={index === 0} aria-label={t("reader.prev")} className="flex size-11 items-center justify-center rounded-full border border-border bg-surface disabled:opacity-35 active:bg-border/60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              {interactive && !onEnd ? (
                <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
                  {/* Dewey beside the hint, hopping when a word is saved. */}
                  <span key={hop} className={`block w-11 shrink-0 ${hop ? "reader-hop" : ""}`}><Mascot mood="hello" className="w-full" /></span>
                  <p dir="auto" className="text-start text-[13px] font-semibold leading-snug text-muted">{t("reader.tapHint")}</p>
                </div>
              ) : (
                <p className="tabular text-[14px] font-semibold text-muted">{onEnd ? t("reader.done") : t("reader.pageLabel", { n: index + 1, total })}</p>
              )}
              <button onClick={() => step(1)} disabled={onEnd} aria-label={t("reader.next")} className="flex size-11 items-center justify-center rounded-full border border-border bg-surface disabled:opacity-35 active:bg-border/60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </>
        )}
      </footer>

      {toast && (
        <p role="status" className={`fade-in pointer-events-none absolute left-1/2 z-10 flex max-w-[88%] -translate-x-1/2 items-center gap-2 rounded-full bg-foreground/95 py-2 text-[13px] font-semibold text-background ${open ? "top-[150px]" : "bottom-28"} ${toast.happy ? "pe-4 ps-2" : "px-4"}`}>
          {toast.happy && <Mascot mood="cheer" className="w-[34px] shrink-0" />}
          {toast.text}
        </p>
      )}

      {levelUp && <LevelUp up={levelUp} onClose={() => setLevelUp(null)} />}

      {wordsOpen && <WordsSheet saved={saved} onRemove={removeSaved} onClose={closeWords} />}
    </div>
  );
}

/** A page's text. Where the version has word cards every word can be tapped, and the matched words are underlined in their colours. */
function PageText({ page, interactive, selected, selectedEnd, lang, size, colours, gloss, onPick }: { page: ReaderPage; interactive: boolean; selected: number; selectedEnd?: number; lang: string; size: number; colours: boolean; gloss: boolean; onPick: (word: string, start: number) => void }) {
  if (!interactive) return <p lang={lang} className="font-reading leading-[1.55] text-foreground" style={{ fontSize: size }}>{page.text}</p>;
  const keys = page.target?.keys ?? [];
  const spans = keySpans(page.text, keys, "w");
  return (
    <>
    <p lang={lang} className="font-reading font-medium leading-[1.55] text-foreground" style={{ fontSize: size }}
       onClick={(e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("[data-w]"); if (el) onPick(el.dataset.w ?? "", Number(el.dataset.s)); }}
       onKeyDown={(e) => {
         if (e.key !== "Enter" && e.key !== " ") return;
         const el = (e.target as HTMLElement).closest<HTMLElement>("[data-w]");
         if (el) { e.preventDefault(); onPick(el.dataset.w ?? "", Number(el.dataset.s)); }
       }}>
      {tokenize(page.text).map((tok, ti, all) => {
        // The space inside a phrase carries the phrase's colour too, so its underline is one bar, not one per word.
        if (!tok.word) {
          const before = ti > 0 ? spans.get(all[ti - 1].start) : undefined;
          const after = ti + 1 < all.length ? spans.get(all[ti + 1].start) : undefined;
          const inSel = selected >= 0 && selectedEnd !== undefined && tok.start >= selected && tok.start < selectedEnd;
          return before !== undefined && before === after && colours && /^\s+$/.test(tok.text)
            ? <span key={tok.start} className={`key-word key-${(before % 3) + 1} ${inSel ? "bg-accent-bright/30" : ""}`}>{tok.text}</span>
            : tok.text;
        }
        const k = spans.get(tok.start) ?? -1;
        const isSel = selected >= 0 && (selectedEnd === undefined ? selected === tok.start : tok.start >= selected && tok.start < selectedEnd);
        return (
          <span key={tok.start} role="button" tabIndex={0} data-w={tok.word} data-s={tok.start} data-sel={isSel ? "" : undefined}
                className={`cursor-pointer transition-colors ${k >= 0 && colours ? `key-word key-${(k % 3) + 1} rounded-none` : "rounded-[5px] px-px"} ${isSel ? "bg-accent-bright/30" : "active:bg-accent-bright/20"}`}>
            {tok.text}
          </span>
        );
      })}
    </p>
    {gloss && page.target && <p lang="en" dir="ltr" className="mt-2 text-[13.5px] italic leading-snug text-muted">{page.target.translation}</p>}
    </>
  );
}

/** The translated sentence, the word that matches the tapped one lit in its colour and the other matched words underlined. */
function TranslatedLine({ line, keys, chosen }: { line: string; keys: { w: string; en: string }[]; chosen: number }) {
  const toks = tokenize(line);
  const spans = keySpans(line, keys, "en");
  const keyOf = (start: number) => spans.get(start) ?? -1;
  // Only the first appearance of the tapped word's (or phrase's) partner is lit, all its words together as one block.
  const words = toks.map((tok, ti) => ({ tok, ti })).filter((x) => x.tok.word);
  const first = chosen >= 0 ? words.findIndex((x) => keyOf(x.tok.start) === chosen) : -1;
  let last = first;
  while (first >= 0 && last + 1 < words.length && keyOf(words[last + 1].tok.start) === chosen) last++;
  const litFrom = first >= 0 ? words[first].ti : -1;
  const litTo = first >= 0 ? words[last].ti : -1;
  const colourOf = (k: number) => `var(--key-${(k % 3) + 1})`;
  return (
    <>
      {toks.map((tok, ti) => {
        const lit = litFrom >= 0 && ti >= litFrom && ti <= litTo;
        if (!tok.word) {
          const before = ti > 0 ? keyOf(toks[ti - 1].start) : -1;
          const after = ti + 1 < toks.length ? keyOf(toks[ti + 1].start) : -2;
          if (!(before >= 0 && before === after && /^\s+$/.test(tok.text))) return tok.text;
          return lit
            ? <span key={tok.start} className="text-white" style={{ background: colourOf(before) }}>{tok.text}</span>
            : <span key={tok.start} className={`key-word key-${(before % 3) + 1}`}>{tok.text}</span>;
        }
        const k = keyOf(tok.start);
        if (k < 0) return <span key={tok.start}>{tok.text}</span>;
        if (lit) {
          const edge = `${ti === litFrom ? "rounded-s-[7px] ps-2 " : ""}${ti === litTo ? "rounded-e-[7px] pe-2 " : ""}`;
          return <span key={tok.start} className={`${edge}py-px text-white`} style={{ background: colourOf(k) }}>{tok.text}</span>;
        }
        return <span key={tok.start} className={`key-word key-${(k % 3) + 1}`}>{tok.text}</span>;
      })}
    </>
  );
}

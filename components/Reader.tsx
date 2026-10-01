"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ObjectPhoto } from "@/components/ObjectPhoto";
import { ScenePhoto } from "@/components/ScenePhoto";
import { WordCard } from "@/components/reader/WordCard";
import type { ReaderPage, ReaderVariant } from "@/components/reader/types";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import { ANSWERS_KEY, parseAnswers } from "@/lib/onboarding/answers";
import { readPage, resumeIndex, savePage, versionKey } from "@/lib/progress";
import { speak, stopSpeaking } from "@/lib/reading/speak";
import { tokenize, translatedLine } from "@/lib/reading/sentences";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { SAVED_KEY, parseSaved, savedId, toggleSaved } from "@/lib/words/saved";
import { XP } from "@/lib/xp/levels";
import { awardFinish, awardPage, trackSeconds } from "@/lib/xp/ledger";
import type { Scene } from "@/lib/preview/catalog";

/** Photos are mounted only for the current page and its neighbours (SPEC.md §10, M4): a 200-page version never holds 200 images. */
const KEEP_PHOTOS = 2;

interface Props {
  slug: string;
  title: string;
  levelId: string;
  levelLabel: string;
  length: number;
  hue: number;
  /** The book in each language it has here, the first being the default. */
  variants: ReaderVariant[];
  scenes: Scene[];
}

const subscribeAnswers = subscribeTo(ANSWERS_KEY);
const readAnswers = () => readRaw(ANSWERS_KEY);
const subscribeSaved = subscribeTo(SAVED_KEY);
const readSaved = () => readRaw(SAVED_KEY);
const serverRaw = () => "";

/**
 * Which language of the book to open: the one the reader is learning, if the book has it, and
 * the first one otherwise. Where there is more than one, a chip on the photo switches (a preview
 * feature; the real app has one language per version).
 */
export function Reader(props: Props) {
  const raw = useSyncExternalStore(subscribeAnswers, readAnswers, serverRaw);
  const learn = useMemo(() => parseAnswers(raw).learn, [raw]);
  const preferred = Math.max(0, props.variants.findIndex((v) => v.lang === learn));
  const [picked, setPicked] = useState<number | null>(null);
  const vi = picked ?? preferred;
  const many = props.variants.length > 1;
  // Keyed by the language, so switching starts a fresh reader on page one.
  return <ReaderView key={vi} {...props} variant={props.variants[vi]} first={vi === 0} onSwitch={many ? () => setPicked((vi + 1) % props.variants.length) : undefined} />;
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
function ReaderView({ slug, title, levelId, levelLabel, length, hue, variant, first, scenes, onSwitch }: Props & { variant: ReaderVariant; first: boolean; onSwitch?: () => void }) {
  const t = useT();
  const locale = useLocale();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pages = variant.pages;
  const total = pages.length;
  const onEnd = index >= total;
  const interactive = !!variant.dict;
  // A second language reads (and is remembered) as its own version.
  const progressSlug = first ? slug : `${slug}.${variant.lang}`;

  const goTo = useCallback((i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.min(Math.max(0, i), total);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
  }, [total]);

  // ── word taps ──
  const [sel, setSel] = useState<{ page: number; word: string; start: number } | null>(null);
  const [slow, setSlow] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const savedRaw = useSyncExternalStore(subscribeSaved, readSaved, serverRaw);
  const saved = useMemo(() => parseSaved(savedRaw), [savedRaw]);
  const say = useCallback((m: string) => {
    setToast(m);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => () => stopSpeaking(), []);

  const selPage = sel ? pages[sel.page] : undefined;
  const keys = selPage?.target?.keys ?? [];
  const keyIx = sel ? keys.findIndex((k) => k.w === sel.word) : -1;
  const colour = keyIx >= 0 ? `var(--key-${(keyIx % 3) + 1})` : "var(--foreground)";
  const entry = sel ? variant.dict?.[sel.word] : undefined;
  const open = sel !== null;
  const mine = languageName(locale, locale);

  const hear = (rate: number) => {
    if (sel && !speak(sel.word, variant.lang, rate)) say(t("reader.noAudio"));
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
        setIndex((prev) => {
          // A word card belongs to the page it was opened on.
          if (prev !== i) { setSel(null); stopSpeaking(); }
          return prev === i ? prev : i;
        });
        // Remembered as the reader moves — never the "end" slide, so reopening
        // resumes on the last page. Saved here, not in an effect, so opening a
        // version never overwrites where the reader had got to.
        if (total > 0) savePage(progressSlug, levelId, length, Math.min(i, total - 1));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [progressSlug, levelId, length, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo]);

  // XP: a page pays once it has been on screen for a moment, finishing pays once, and the
  // time spent feeds the dashboard's graph. All of it is kept on the device (lib/xp).
  const version = versionKey(progressSlug, levelId, length);
  const [gain, setGain] = useState<{ xp: number; finish: boolean; n: number } | null>(null);
  const flash = useCallback((xp: number, finish: boolean) => setGain((g) => ({ xp, finish, n: (g?.n ?? 0) + 1 })), []);
  useEffect(() => {
    if (!gain) return;
    const id = window.setTimeout(() => setGain(null), 1600);
    return () => window.clearTimeout(id);
  }, [gain]);
  useEffect(() => {
    if (total === 0 || index >= total) return;
    const id = window.setTimeout(() => {
      const xp = awardPage(version, index + 1, levelId);
      if (xp > 0) flash(xp, false);
    }, XP.dwellMs);
    return () => window.clearTimeout(id);
  }, [index, total, version, levelId, flash]);
  useEffect(() => {
    if (!onEnd || total === 0) return;
    // After the end slide has settled, not in the same breath as arriving on it.
    const id = window.setTimeout(() => {
      const xp = awardFinish(version, total);
      if (xp > 0) flash(xp, true);
    }, 400);
    return () => window.clearTimeout(id);
  }, [onEnd, total, version, flash]);
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === "visible") trackSeconds(slug, 5); }, 5000);
    return () => window.clearInterval(id);
  }, [slug]);

  const progress = onEnd ? 100 : Math.round(((index + 1) / total) * 100);
  const isPreview = length > total;
  const sub = [onEnd ? t("reader.done") : t("reader.pageLabel", { n: index + 1, total }), levelLabel, languageName(variant.lang, locale)].join(" · ");

  // The photo is six wide by five tall, as wide as the column allows, and shorter while a word card is open so the text keeps room.
  const photoH = `min(${open ? 22 : 38}dvh, calc((min(100vw, 440px) - 36px) / 1.2))`;

  return (
    <div className="relative flex h-dvh flex-col">
      <header className="safe-top shrink-0 px-4 pt-2">
        <div className="flex h-11 items-center gap-1">
          <Link href={`/book/${slug}`} aria-label={t("reader.backBook")} className="-ms-2 flex size-11 shrink-0 items-center justify-center rounded-full active:bg-border/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-semibold uppercase tracking-[0.09em] text-muted">{title}</p>
            <p className="truncate text-[12px] text-muted" aria-live="polite">{sub}{isPreview ? ` · ${t("reader.preview")}` : ""}</p>
          </div>
          {interactive && (
            <button type="button" aria-pressed={slow} aria-label={t("reader.slowAudio")}
                    onClick={() => { setSlow(!slow); say(slow ? t("reader.slowOff") : t("reader.slowOn")); }}
                    className={`grid size-10 shrink-0 place-items-center rounded-full ${slow ? "bg-accent-bright/25 text-foreground" : "text-muted active:bg-border/60"}`}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4.5 16C4.5 11.8 7.7 8.5 11.5 8.5S18.5 11.8 18.5 16z" /><path d="M11.5 8.8V16M7.8 11.3l1.5 4.7M15.2 11.3l-1.5 4.7" strokeWidth="1.25" />
                <circle cx="20.9" cy="13.9" r="1.7" /><path d="M18.6 14.9l1 -.5M8 16v2.3M15 16v2.3M4.5 16L3 17.2" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={t("reader.progress")}>
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* What the line you tapped says in the reader's own language. */}
      {sel && selPage?.target && (
        <div className="line-down mt-2 shrink-0 border-y border-border bg-surface px-4 pb-2 pt-1.5">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">{t("reader.lineIn", { language: mine })}</p>
          <p className="font-reading text-[16px] font-medium leading-[1.6]">
            <TranslatedLine line={translatedLine(selPage.text, selPage.target.translation, sel.start)} keys={keys} chosen={keyIx} />
          </p>
        </div>
      )}

      <div ref={scroller} dir="ltr" className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain" aria-label={t("reader.pages")}>
        {pages.map((p, i) => {
          const near = Math.abs(i - index) <= KEEP_PHOTOS;
          const scene = scenes[p.scene - 1];
          return (
            <section key={p.n} className="flex h-full w-full shrink-0 snap-start flex-col overflow-hidden" aria-roledescription="page" aria-label={t("reader.pageLabel", { n: p.n, total })}>
              <div className="flex shrink-0 justify-center px-[18px] pt-3" onClick={() => open && setSel(null)}>
                <div className="relative aspect-[6/5] overflow-hidden rounded-[26px] border-[1.5px] border-border bg-surface transition-[height] duration-200" style={{ height: photoH }}>
                  {near ? (
                    p.target
                      ? <ObjectPhoto art={p.target.art} bg={p.target.bg} caption={scene?.caption ?? ""} className="h-full w-full" />
                      : <ScenePhoto n={p.scene} hue={hue} caption={scene?.caption ?? ""} pill={false} className="h-full w-full" />
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
                <PageText page={p} interactive={interactive} selected={sel && sel.page === i ? sel.start : -1} lang={variant.lang}
                          onPick={(word, start) => setSel({ page: i, word, start })} />
              </div>
            </section>
          );
        })}

        <section className="flex h-full w-full shrink-0 snap-start flex-col items-center justify-center px-8 text-center" aria-label={t("reader.end")}>
          <p className="font-reading text-[26px] font-bold">{t("reader.endTitle")}</p>
          <p className="mt-3 max-w-[30ch] text-[15px] leading-snug text-muted">
            {isPreview ? t("reader.endBodyPreview", { total, length }) : t("reader.endBody", { total })}
          </p>
          <Link href={`/book/${slug}`} className="mt-7 inline-flex h-12 items-center rounded-full bg-foreground px-7 text-[15px] font-semibold text-background">
            {t("reader.another")}
          </Link>
          <Link href="/" className="mt-3 inline-flex h-11 items-center text-[14px] font-semibold text-muted">{t("reader.toLibrary")}</Link>
        </section>
      </div>

      <footer className={`safe-bottom relative shrink-0 px-5 ${open ? "rounded-t-[26px] border-t border-border bg-background pb-3 pt-3 shadow-[0_-8px_28px_rgba(0,0,0,.08)]" : "pb-3 pt-2"}`}>
        {gain && (
          <p key={gain.n} className="xp-pop tabular pointer-events-none absolute inset-x-0 -top-9 mx-auto w-fit rounded-full bg-accent px-3 py-1 text-[13px] font-bold text-white shadow-md" role="status">
            {gain.finish ? t("reader.finishXp", { xp: gain.xp }) : t("reader.xp", { xp: gain.xp })}
          </p>
        )}
        {sel ? (
          <WordCard word={sel.word} entry={entry} colour={colour} language={mine}
                    matched={keyIx >= 0 ? keys[keyIx].en : null}
                    saved={savedId(variant.lang, sel.word) in saved}
                    onListen={() => hear(slow ? 0.55 : 0.9)} onSlow={() => hear(0.5)}
                    onSave={() => say(toggleSaved({ word: sel.word, lang: variant.lang, meaning: entry?.mean ?? "", book: title }) ? t("reader.savedToast") : t("reader.removedToast"))}
                    onClose={() => setSel(null)} />
        ) : (
          <>
            {interactive && !onEnd && <p className="pb-1.5 text-center text-[13px] font-medium text-muted">{t("reader.tapHint")}</p>}
            <div dir="ltr" className="flex items-center justify-between">
              <button onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={t("reader.prev")} className="flex size-11 items-center justify-center rounded-full border border-border bg-surface disabled:opacity-35 active:bg-border/60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <p className="tabular text-[14px] font-semibold text-muted">{onEnd ? t("reader.done") : t("reader.pageLabel", { n: index + 1, total })}</p>
              <button onClick={() => goTo(index + 1)} disabled={onEnd} aria-label={t("reader.next")} className="flex size-11 items-center justify-center rounded-full border border-border bg-surface disabled:opacity-35 active:bg-border/60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </>
        )}
      </footer>

      {toast && (
        <p role="status" className="fade-in pointer-events-none absolute bottom-28 left-1/2 z-10 max-w-[88%] -translate-x-1/2 rounded-full bg-foreground/95 px-4 py-2.5 text-center text-[13px] font-semibold text-background">{toast}</p>
      )}
    </div>
  );
}

/** A page's text. Where the version has word cards every word can be tapped, and the matched words are underlined in their colours. */
function PageText({ page, interactive, selected, lang, onPick }: { page: ReaderPage; interactive: boolean; selected: number; lang: string; onPick: (word: string, start: number) => void }) {
  if (!interactive) return <p className="font-reading text-[19px] leading-[1.55] text-foreground">{page.text}</p>;
  const keys = page.target?.keys ?? [];
  return (
    <p lang={lang} className="font-reading text-[19px] font-medium leading-[1.55] text-foreground"
       onClick={(e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("[data-w]"); if (el) onPick(el.dataset.w ?? "", Number(el.dataset.s)); }}
       onKeyDown={(e) => {
         if (e.key !== "Enter" && e.key !== " ") return;
         const el = (e.target as HTMLElement).closest<HTMLElement>("[data-w]");
         if (el) { e.preventDefault(); onPick(el.dataset.w ?? "", Number(el.dataset.s)); }
       }}>
      {tokenize(page.text).map((tok) => {
        if (!tok.word) return tok.text;
        const k = keys.findIndex((x) => x.w === tok.word);
        return (
          <span key={tok.start} role="button" tabIndex={0} data-w={tok.word} data-s={tok.start}
                className={`cursor-pointer rounded-[5px] px-px transition-colors ${k >= 0 ? `key-word key-${(k % 3) + 1}` : ""} ${selected === tok.start ? "bg-accent-bright/30" : "active:bg-accent-bright/20"}`}>
            {tok.text}
          </span>
        );
      })}
    </p>
  );
}

/** The translated sentence, the word that matches the tapped one lit in its colour and the other matched words underlined. */
function TranslatedLine({ line, keys, chosen }: { line: string; keys: { w: string; en: string }[]; chosen: number }) {
  const toks = tokenize(line);
  const keyOf = (word: string | undefined) => keys.findIndex((x) => x.en.toLowerCase() === word);
  // Only the first appearance of the tapped word's partner is lit.
  const litAt = toks.find((tok) => tok.word && chosen >= 0 && keyOf(tok.word) === chosen)?.start ?? -1;
  return (
    <>
      {toks.map((tok) => {
        if (!tok.word) return tok.text;
        const k = keyOf(tok.word);
        if (k < 0) return <span key={tok.start}>{tok.text}</span>;
        const isChosen = tok.start === litAt;
        return (
          <span key={tok.start} className={`key-word key-${(k % 3) + 1} ${isChosen ? "rounded-[7px] px-2 py-px text-white no-underline" : ""}`}
                style={isChosen ? { background: `var(--key-${(k % 3) + 1})`, textDecoration: "none" } : undefined}>
            {tok.text}
          </span>
        );
      })}
    </>
  );
}

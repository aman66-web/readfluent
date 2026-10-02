"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useLocale, useT } from "@/lib/i18n/react";
import { PROGRESS_KEY, parseProgress, versionKey } from "@/lib/progress";
import { readRaw, subscribeTo } from "@/lib/store/local";

export interface OutlineItem { n: number; text: string }

const subscribe = subscribeTo(PROGRESS_KEY);
const server = () => "";

/** Moments to a chapter: a path of ten is short enough to take in and long enough to feel like going somewhere. */
export const PART_SIZE = 10;
const ROW = 108;
const WIDTH = 360;
const NODE = 60;
/** How far a node sits left (−) or right (+) of the middle, in steps that make the path wind. */
const WIND = [-46, 0, 46, 64, 46, 0, -46, -64] as const;
export const windOf = (i: number): number => WIND[i % WIND.length];

/** Which page of a `length`-page version a moment of the outline opens. */
export const pageOfMoment = (momentIndex: number, moments: number, length: number): number =>
  Math.min(length - 1, Math.floor((momentIndex * length) / Math.max(1, moments)));

/** The moment the reader is at: the last one whose page they have reached (null before the first page). */
export function currentMoment(reached: number | undefined, moments: number, length: number): number | null {
  if (reached === undefined) return null;
  let at: number | null = null;
  for (let i = 0; i < moments; i++) if (pageOfMoment(i, moments, length) <= reached) at = i;
  return at;
}

/**
 * The book's way through, as a winding path: its moments, in order, in parts of ten. The ones already
 * read are lit with a tick, the one to carry on from is marked, and a tap on any of them opens the book
 * at that page. It follows the level and length chosen above it.
 */
export function Pathway({ slug, level, length, outline, chapters, onOpen }: {
  slug: string;
  /** The level's address part (a1a2…). */
  level: string;
  length: number;
  outline: readonly OutlineItem[];
  /** One name per chapter of ten moments, where the book has them. */
  chapters?: readonly string[];
  /** Opens the reader at this page (0-based). */
  onOpen: (page: number) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const raw = useSyncExternalStore(subscribe, () => readRaw(PROGRESS_KEY), server);
  const reached = useMemo(() => parseProgress(raw)[versionKey(slug, level, length)], [raw, slug, level, length]);
  const here = currentMoment(reached, outline.length, length);
  const parts = Math.ceil(outline.length / PART_SIZE);
  // A long book is a list of chapters, closed but for the one the reader is in; a tap opens or closes one.
  const [picked, setPicked] = useState<ReadonlySet<number> | null>(null);
  const open = picked ?? new Set([here === null ? 0 : Math.floor(here / PART_SIZE)]);
  const toggle = (p: number) => setPicked((cur) => { const next = new Set(cur ?? open); if (next.has(p)) next.delete(p); else next.add(p); return next; });

  return (
    <section data-tour="path" className="mt-8" aria-label={t("path.title")}>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent">{t("path.title")}</h2>
      {Array.from({ length: parts }, (_, p) => {
        const items = outline.slice(p * PART_SIZE, p * PART_SIZE + PART_SIZE);
        const first = p * PART_SIZE;
        const from = pageOfMoment(first, outline.length, length) + 1;
        const to = pageOfMoment(first + items.length, outline.length, length) + (first + items.length >= outline.length ? 1 : 0);
        return (
          <div key={p} className="mt-3">
            <button type="button" aria-expanded={open.has(p)} onClick={() => toggle(p)}
                    className="sheet-card flex w-full items-center gap-3.5 rounded-[20px] px-4 py-3.5 text-start transition-transform active:scale-[0.99]">
              <span aria-hidden className="tabular grid size-10 shrink-0 place-items-center rounded-full bg-accent-bright text-[15px] font-bold text-on-cyan">{p + 1}</span>
              <span className="min-w-0 flex-1">
                <span lang={locale === "en" ? "en" : undefined} className="block text-[16px] font-semibold leading-tight">{chapters?.[p] ?? t("path.chapterN", { n: p + 1 })}</span>
                <span className="tabular mt-0.5 block text-[12.5px] text-muted">{t("path.pages", { from, to: Math.max(from, to) })} · {here === null ? 0 : Math.max(0, Math.min(items.length, here - first + 1))}/{items.length}</span>
              </span>
              <svg viewBox="0 0 24 24" className={`size-5 shrink-0 text-faint transition-transform ${open.has(p) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {open.has(p) && <ol className="relative mx-auto mt-3 w-full max-w-[360px]" style={{ height: items.length * ROW }} dir="ltr">
              <svg viewBox={`0 0 ${WIDTH} ${items.length * ROW}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
                {items.slice(1).map((_, k) => {
                  const x1 = WIDTH / 2 + windOf(k), y1 = k * ROW + ROW / 2;
                  const x2 = WIDTH / 2 + windOf(k + 1), y2 = (k + 1) * ROW + ROW / 2;
                  const lit = here !== null && first + k + 1 <= here;
                  return <path key={k} d={`M${x1} ${y1} C${x1} ${y1 + ROW * 0.55} ${x2} ${y2 - ROW * 0.55} ${x2} ${y2}`} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                               stroke={lit ? "var(--accent-bright)" : "var(--border)"} strokeWidth={lit ? 4 : 3} strokeDasharray={lit ? undefined : "2 8"} />;
                })}
              </svg>
              {items.map((item, k) => {
                const i = first + k;
                const off = windOf(k);
                const page = pageOfMoment(i, outline.length, length);
                const state = here === null ? (i === 0 ? "current" : "next") : i < here ? "done" : i === here ? "current" : "next";
                const cx = ((WIDTH / 2 + off) / WIDTH) * 100;
                // The words go on the side the path is moving away from: left of a node drifting right, right of one drifting back.
                const labelRight = off < 0 || (off === 0 && k > 0 && windOf(k - 1) > 0);
                return (
                  <li key={item.n} data-state={state} className="absolute inset-x-0" style={{ top: k * ROW, height: ROW }}>
                    <button type="button" onClick={() => onOpen(page)} aria-label={`${t("reader.pageLabel", { n: page + 1, total: length })}: ${item.text}`}
                            className={`absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform active:scale-95 ${
                              state === "done" ? "bg-accent-bright text-on-cyan shadow-[0_6px_14px_-6px_rgba(14,116,144,.7)]" : state === "current" ? "bg-accent-bright text-on-cyan ring-[6px] ring-accent-bright/40" : "border-2 border-border bg-surface text-muted"}`}
                            style={{ left: `${cx}%`, width: NODE, height: NODE }}>
                      {state === "done" ? (
                        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      ) : state === "current" ? (
                        <svg viewBox="0 0 24 24" className="size-6 translate-x-px" fill="currentColor" aria-hidden><path d="M8 5.5v13l11-6.5z" /></svg>
                      ) : (
                        <span className="tabular text-[17px] font-bold">{page + 1}</span>
                      )}
                    </button>
                    <div className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${labelRight ? "text-start" : "text-end"}`}
                         style={labelRight ? { left: `calc(${cx}% + ${NODE / 2 + 12}px)`, right: 0 } : { right: `calc(${100 - cx}% + ${NODE / 2 + 12}px)`, left: 0 }}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent">{state === "current" ? t(reached === undefined ? "sheet.read" : "home.carryOn") : t("reader.pageLabel", { n: page + 1, total: length })}</p>
                      <p lang={locale} dir="auto" className={`mt-0.5 line-clamp-3 text-[15px] font-semibold leading-snug ${state === "next" ? "text-foreground/75" : ""}`}>{item.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>}
          </div>
        );
      })}
    </section>
  );
}

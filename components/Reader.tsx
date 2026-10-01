"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScenePhoto } from "@/components/ScenePhoto";
import { readPage, resumeIndex, savePage } from "@/lib/progress";
import type { PreviewPage, Scene } from "@/lib/preview/catalog";

/** Photos are mounted only for the current page and its neighbours (SPEC.md §10, M4): a 200-page version never holds 200 images. */
const KEEP_PHOTOS = 2;

interface Props {
  slug: string;
  title: string;
  levelId: string;
  levelLabel: string;
  length: number;
  hue: number;
  pages: PreviewPage[];
  scenes: Scene[];
}

/**
 * Reading a version, one page at a time, swipe-through: a photo, a few lines, the
 * page number and a progress bar (SPEC.md §3). Native scroll-snap does the
 * swiping, so it feels like the phone's own and costs no gesture code; the
 * buttons and arrow keys drive the same scroller. Where the reader got to is
 * kept on the device and picked up again.
 */
export function Reader({ slug, title, levelId, levelLabel, length, hue, pages, scenes }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const total = pages.length;
  const onEnd = index >= total;

  const goTo = useCallback((i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.min(Math.max(0, i), total);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
  }, [total]);

  // Pick up where the reader left off. After mount, because the server has no
  // device storage and the first render has to match it.
  useEffect(() => {
    // The scroll this causes is what updates `index` (see the scroll handler).
    const start = resumeIndex(readPage(slug, levelId, length), total);
    if (start > 0) goTo(start, false);
  }, [slug, levelId, length, total, goTo]);

  // Which page the scroller is showing, as it moves.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setIndex((prev) => (prev === i ? prev : i));
        // Remembered as the reader moves — never the "end" slide, so reopening
        // resumes on the last page. Saved here, not in an effect, so opening a
        // version never overwrites where the reader had got to.
        if (total > 0) savePage(slug, levelId, length, Math.min(i, total - 1));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [slug, levelId, length, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo]);

  const progress = onEnd ? 100 : Math.round(((index + 1) / total) * 100);
  const isPreview = length > total;

  return (
    <div className="flex h-dvh flex-col">
      <header className="safe-top shrink-0 px-4 pb-2 pt-2">
        <div className="flex h-11 items-center gap-2">
          <Link href={`/book/${slug}`} aria-label="Back to the book" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{title}</p>
          <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-muted">
            {levelLabel} · {length}{isPreview ? " · preview" : ""}
          </span>
        </div>
      </header>

      <div ref={scroller} className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain" aria-label="Pages">
        {pages.map((p, i) => {
          const scene = scenes[p.scene - 1];
          const near = Math.abs(i - index) <= KEEP_PHOTOS;
          return (
            <section key={p.n} className="flex h-full w-full shrink-0 snap-start flex-col overflow-hidden" aria-roledescription="page" aria-label={`Page ${p.n} of ${total}`}>
              {near ? (
                <ScenePhoto n={p.scene} hue={hue} caption={scene?.caption ?? ""} className="aspect-[16/10] max-h-[34dvh] w-full shrink-0" />
              ) : (
                <div className="aspect-[16/10] max-h-[34dvh] w-full shrink-0 bg-border/50" aria-hidden />
              )}
              <div className="flex-1 overflow-y-auto px-6 pb-3 pt-5">
                <p className="font-reading text-[19px] leading-[1.5] text-foreground">{p.text}</p>
              </div>
            </section>
          );
        })}

        <section className="flex h-full w-full shrink-0 snap-start flex-col items-center justify-center px-8 text-center" aria-label="The end">
          <p className="font-reading text-[26px] font-bold">That&apos;s the end of the preview</p>
          <p className="mt-3 max-w-[30ch] text-[15px] leading-snug text-muted">
            You read {total} pages{isPreview ? `. The real ${length}-page version arrives with the full content` : ""}. Try another level to see how the same story changes.
          </p>
          <Link href={`/book/${slug}`} className="mt-7 inline-flex h-12 items-center rounded-full bg-foreground px-7 text-[15px] font-semibold text-background">
            Choose another level
          </Link>
          <Link href="/" className="mt-3 inline-flex h-11 items-center text-[14px] font-semibold text-muted">Back to the library</Link>
        </section>
      </div>

      <footer className="safe-bottom shrink-0 px-5 pb-3 pt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Reading progress">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous page" className="flex size-11 items-center justify-center rounded-full border border-border bg-surface disabled:opacity-35 active:bg-border/60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <p className="tabular text-[14px] font-semibold text-muted" aria-live="polite">
            {onEnd ? "Done" : `Page ${index + 1} of ${total}`}
          </p>
          <button onClick={() => goTo(index + 1)} disabled={onEnd} aria-label="Next page" className="flex size-11 items-center justify-center rounded-full border border-border bg-surface disabled:opacity-35 active:bg-border/60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { Lex } from "@/components/mascot/Lex";
import { PrimaryButton } from "./ui";

/**
 * The guide: the first-run screens where the app talks the reader through it. The
 * frame is what they share — a back arrow, the run's progress, and Continue at the
 * foot — then the guide itself (Lex, the mascot), and the guide saying its line:
 * the pages turn faster while the words arrive one after another,
 * and the line sits large on the white ground rather than in a bubble.
 *
 * Adapted from the first run of the app this one's engineering came from, with
 * its voice recordings left out (there are none here) and its colours changed.
 */

/** How long a line's words take to arrive, one after another. */
const WORD_START = 450;
const WORD_STEP = 105;
const wordsMs = (n: number) => WORD_START + n * WORD_STEP;

/**
 * A line as the words that arrive one after another. Most languages put spaces
 * between words; Chinese and Japanese do not, so the browser's own word breaker
 * finds them (and punctuation stays with the word before it).
 */
const NO_SPACES: readonly LanguageCode[] = ["zh", "ja"];
export function splitWords(line: string, locale: LanguageCode): { words: string[]; joiner: string } {
  if (NO_SPACES.includes(locale) && typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const words: string[] = [];
    for (const { segment, isWordLike } of new Intl.Segmenter(locale, { granularity: "word" }).segment(line)) {
      if (isWordLike || words.length === 0) words.push(segment);
      else words[words.length - 1] += segment;
    }
    return { words, joiner: "" };
  }
  return { words: line.split(/\s+/).filter(Boolean), joiner: " " };
}

/** The guide saying a line: `talking` until its words have arrived. */
export function useGuide(line: string) {
  const locale = useLocale();
  const words = splitWords(line, locale).words.length;
  const totalMs = wordsMs(words);
  const [quietFor, setQuietFor] = useState<string | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setQuietFor(line), totalMs + 200);
    return () => window.clearTimeout(id);
  }, [line, totalMs]);
  return { talking: quietFor !== line, totalMs, perWordMs: totalMs / words };
}
export type Guide = ReturnType<typeof useGuide>;

/** The frame every guide screen sits in. */
export function GuideFrame({ at, of, onBack, onContinue, canContinue = true, showContinue = true, continueLabel, progress = true, children }: {
  /** Which step of the run this is, and how many there are, for the progress. */
  at: number;
  of: number;
  onBack: () => void;
  onContinue: () => void;
  /** Off until the screen has what it asks for. */
  canContinue?: boolean;
  /** Off where the screen's own buttons are the way on (signing in). */
  showContinue?: boolean;
  /** What the button says, where "Continue" undersells it (the last screen). */
  continueLabel?: string;
  /** Off on the screen where Lex says hello: just the back arrow, no steps. */
  progress?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <main className="ob guide relative flex h-[100dvh] flex-col overflow-clip px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div className="relative flex shrink-0 items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t("ui.back")}
                className="-ms-2.5 grid size-11 shrink-0 place-items-center rounded-full transition-colors active:bg-black/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6 rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        {/* The run's steps, one strip each; the ones behind are lit. */}
        {progress ? (
          <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={of} aria-valuenow={at + 1} aria-label={t("guide.progress")}>
            {Array.from({ length: of }, (_, n) => (
              <span key={n} className="guide-track h-[3px] flex-1 overflow-hidden rounded-full">
                <span className="guide-step block h-full origin-left rounded-full rtl:origin-right" style={{ transform: `scaleX(${n <= at ? 1 : 0})` }} />
              </span>
            ))}
          </div>
        ) : <span className="flex-1" aria-hidden />}
        <span className="size-11 shrink-0" aria-hidden />
      </div>

      {children}

      {showContinue && (
        <div className="relative shrink-0">
          <PrimaryButton disabled={!canContinue} onClick={onContinue}>{continueLabel ?? t("ui.continue")}</PrimaryButton>
        </div>
      )}
    </main>
  );
}

/**
 * The top of a guide screen that asks something: the guide small with its name,
 * the line it is saying, and, where there is one, a quieter line under it that
 * arrives once the words have.
 */
export function GuideHead({ guide, line, sub }: { guide: Guide; line: string; sub?: string }) {
  const t = useT();
  return (
    <div className="shrink-0">
      <div className="flex items-center gap-3">
        <Lex mood="hello" talking={guide.talking} crop="head" className="w-[60px] shrink-0" />
        <p className="ed-serif ob-muted text-[14px] italic">{t("guide.name")}</p>
      </div>
      <Said line={line} durationMs={guide.totalMs} className="mt-3 text-[29px] font-light leading-[1.12] tracking-[-0.025em]" />
      {sub && (
        <p className="wel-in ob-muted mt-2.5 text-[14px] leading-snug" style={{ animationDelay: `${guide.totalMs}ms` }}>{sub}</p>
      )}
    </div>
  );
}

/** A line, its words arriving one after another, the last landing as the guide stops talking. */
export function Said({ line, durationMs, className = "" }: { line: string; durationMs?: number; className?: string }) {
  const locale = useLocale();
  const { words, joiner } = splitWords(line, locale);
  const delayFor = (i: number) => (durationMs !== undefined ? Math.round(((i + 1) / words.length) * durationMs) : WORD_START + i * WORD_STEP);
  return (
    <p className={`bp-words ${className}`} aria-live="polite">
      {words.map((w, i) => (
        <span key={i}>
          <span className="bp-w" style={{ animationDelay: `${delayFor(i)}ms` }}>{w}</span>{i < words.length - 1 ? joiner : ""}
        </span>
      ))}
    </p>
  );
}

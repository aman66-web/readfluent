"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PrimaryButton } from "./ui";

/**
 * The guide: the first-run screens where the app talks the reader through it. The
 * frame is what they share — a back arrow, the run's progress, and Continue at the
 * foot — then the guide itself (a sphere of lamps), and the guide saying its line:
 * the lamps ripple out from the middle while the words arrive one after another,
 * and the line sits large on the white ground rather than in a bubble.
 *
 * Adapted from the first run of the app this one's engineering came from, with
 * its voice recordings left out (there are none here) and its colours changed.
 */

/** How long a line's words take to arrive, one after another. */
const WORD_START = 450;
const WORD_STEP = 105;
const wordsMs = (n: number) => WORD_START + n * WORD_STEP;

/** The guide saying a line: `talking` until its words have arrived. */
export function useGuide(line: string) {
  const words = line.split(/\s+/).length;
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
export function GuideFrame({ at, of, onBack, onContinue, canContinue = true, showContinue = true, continueLabel = "Continue", children }: {
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
  children: ReactNode;
}) {
  return (
    <main className="ob guide relative flex h-[100dvh] flex-col overflow-clip px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div className="relative flex shrink-0 items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back"
                className="-ms-2.5 grid size-11 shrink-0 place-items-center rounded-full transition-colors active:bg-black/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        {/* The run's steps, one strip each; the ones behind are lit. */}
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={of} aria-valuenow={at + 1} aria-label="Progress">
          {Array.from({ length: of }, (_, n) => (
            <span key={n} className="guide-track h-[3px] flex-1 overflow-hidden rounded-full">
              <span className="guide-step block h-full rounded-full" style={{ transform: `scaleX(${n <= at ? 1 : 0})`, transformOrigin: "left" }} />
            </span>
          ))}
        </div>
        <span className="size-11 shrink-0" aria-hidden />
      </div>

      {children}

      {showContinue && (
        <div className="relative shrink-0">
          <PrimaryButton disabled={!canContinue} onClick={onContinue}>{continueLabel}</PrimaryButton>
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
  return (
    <div className="shrink-0">
      <div className="flex items-center gap-3">
        <Orb talking={guide.talking} className="w-[52px] shrink-0" />
        <p className="ed-serif ob-muted text-[14px] italic">Your guide</p>
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
  const words = line.split(/\s+/);
  const delayFor = (i: number) => (durationMs !== undefined ? Math.round(((i + 1) / words.length) * durationMs) : WORD_START + i * WORD_STEP);
  return (
    <p className={`bp-words ${className}`} aria-live="polite">
      {words.map((w, i) => (
        <span key={i}>
          <span className="bp-w" style={{ animationDelay: `${delayFor(i)}ms` }}>{w}</span>{i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

/*
 * The guide itself: a sphere of lamps, the dot-matrix idea made round. Lamps are
 * packed in offset rows inside a circle; each is smaller and dimmer toward the
 * edge, so the disc reads as a lit ball, coloured from bright cyan at the middle
 * through teal to a deep blue at the rim (deep enough to show on white).
 */
const R = 100;
function lamps(pitch: number, size: number) {
  const out: { x: number; y: number; r: number; d: number; c: string }[] = [];
  let row = 0;
  for (let y = -R; y <= R; y += pitch * 0.87, row++) {
    for (let x = -R + (row % 2 ? pitch / 2 : 0); x <= R; x += pitch) {
      const d = Math.hypot(x, y) / R;
      if (d > 1) continue;
      const c = d < 0.35 ? "#06B6D4" : d < 0.6 ? "#0891B2" : d < 0.82 ? "#0E7490" : "#164E63";
      out.push({ x: +x.toFixed(1), y: +y.toFixed(1), r: +((size - d * 1.9) * (pitch / 12.5)).toFixed(2), d: +d.toFixed(3), c });
    }
  }
  return out;
}
const LAMPS = lamps(12.5, 4.3);

export function Orb({ talking, className = "" }: { talking: boolean; className?: string }) {
  return (
    <svg viewBox="-120 -120 240 240" className={`lamp-orb ${talking ? "lamp-talking" : ""} ${className}`} aria-hidden>
      <defs>
        <radialGradient id="lamp-glow">
          <stop offset="0" stopColor="#22D3EE" stopOpacity={0.4} />
          <stop offset=".6" stopColor="#06B6D4" stopOpacity={0.12} />
          <stop offset="1" stopColor="#0891B2" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle className="lamp-halo" r={118} fill="url(#lamp-glow)" />
      {LAMPS.map((l, i) => (
        <circle key={i} className="lamp" cx={l.x} cy={l.y} r={l.r} fill={l.c}
                style={{ ["--d" as string]: l.d, ["--o" as string]: +(1 - l.d * l.d * 0.32).toFixed(3) }} />
      ))}
    </svg>
  );
}

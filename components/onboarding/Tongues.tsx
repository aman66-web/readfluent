"use client";

import { useState } from "react";
import { LANGUAGES, type LanguageCode } from "@/lib/onboarding/languages";
import { tonguesNote, tonguesSummary } from "@/lib/onboarding/tongues";
import { GuideFrame, GuideHead, useGuide } from "./Guide";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * The first question after the welcome: which language the reader speaks (the one
 * the app and its word meanings are in) and which they want to learn (the one the
 * books are in). Two cards, one sentence that says what the pair means, and a full
 * list that opens over the screen when a card is tapped.
 */

type Which = "speak" | "learn";

function Card({ kicker, code, empty, onOpen, delay }: {
  kicker: string; code: LanguageCode | null; empty: string; onOpen: () => void; delay: number;
}) {
  const lang = LANGUAGES.find((l) => l.code === code);
  return (
    <button type="button" onClick={onOpen}
            className="guide-card wel-in relative flex w-full items-center gap-3 rounded-[20px] px-5 py-3.5 text-start"
            style={{ animationDelay: `${delay}ms` }}>
      <span className="min-w-0 flex-1">
        <span className="ob-muted block text-[12px] font-semibold uppercase tracking-[.08em]">{kicker}</span>
        <span lang={lang?.code} className={`mt-0.5 block truncate text-[22px] font-semibold leading-tight ${lang ? "" : "ob-muted"}`}>
          {lang ? lang.native : empty}
        </span>
        {lang && lang.label !== lang.native && <span className="ob-muted block truncate text-[13px]">{lang.label}</span>}
      </span>
      <span className="ob-muted shrink-0 text-[13px] font-semibold" aria-hidden="true">{lang ? "Change" : "Choose"}</span>
    </button>
  );
}

/** The full list, over the screen. Choosing closes it. */
function Sheet({ title, value, onPick, onClose }: {
  title: string; value: LanguageCode | null; onPick: (l: LanguageCode) => void; onClose: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="ob fixed inset-0 z-30 flex flex-col bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="flex shrink-0 items-center justify-between pb-3">
        <h2 className="text-[20px] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="-me-2 grid h-11 place-items-center rounded-full px-3 text-[15px] font-semibold active:bg-black/5">Close</button>
      </div>
      <ul className="-mx-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-1 pb-4 pt-1">
        {LANGUAGES.map((l) => {
          const on = value === l.code;
          return (
            <li key={l.code}>
              <button type="button" onClick={() => onPick(l.code)} aria-pressed={on}
                      className={`guide-card relative flex h-14 w-full flex-col justify-center rounded-[16px] px-3.5 text-start ${on ? "guide-card-on" : ""}`}>
                <span lang={l.code} className="block truncate text-[13px] font-semibold">{l.native}</span>
                {l.label !== l.native && <span className="ob-muted block truncate text-[11px]">{l.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TonguesScreen({ at, of, speak, learn, onSpeak, onLearn, onBack, onContinue }: Nav & {
  speak: LanguageCode;
  learn: LanguageCode | null;
  onSpeak: (l: LanguageCode) => void;
  onLearn: (l: LanguageCode) => void;
}) {
  const line = "Which languages?";
  const guide = useGuide(line);
  const [open, setOpen] = useState<Which | null>(null);
  const note = tonguesNote(speak, learn);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-3 pt-5">
        <GuideHead guide={guide} line={line} sub="Pick the language you speak and the one you want to learn. The books are in the second; help with the words is in the first." />
        <div className="mt-6 flex flex-col gap-2.5">
          <Card kicker="I speak" code={speak} empty="Choose a language" onOpen={() => setOpen("speak")} delay={700} />
          <Card kicker="I want to learn" code={learn} empty="Choose a language" onOpen={() => setOpen("learn")} delay={820} />
        </div>
        <p className="wel-in mt-4 text-center text-[15px] font-semibold leading-snug" style={{ animationDelay: "940ms" }} aria-live="polite">
          {tonguesSummary(speak, learn)}
        </p>
        {note && <p className="ob-muted wel-in mt-1.5 text-center text-[13px] leading-snug" style={{ animationDelay: "1020ms" }}>{note}</p>}
      </div>
      {open && (
        <Sheet title={open === "speak" ? "I speak…" : "I want to learn…"} value={open === "speak" ? speak : learn}
               onPick={(l) => { (open === "speak" ? onSpeak : onLearn)(l); setOpen(null); }} onClose={() => setOpen(null)} />
      )}
    </GuideFrame>
  );
}

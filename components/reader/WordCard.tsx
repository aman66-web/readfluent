"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/react";
import type { WordEntry } from "@/lib/preview/spanish";

/**
 * The word card at the foot of the reader: the English for the tapped word, in the word's colour,
 * one line on when it is used, and three buttons: hear the Spanish, hear it slowly, save it for
 * the flashcards.
 */
export function WordCard({ word, entry, colour, saved, onListen, onSlow, onSave, onClose }: {
  word: string;
  entry: WordEntry | undefined;
  /** The CSS colour of the word, from its pair; plain ink where the word is not one of the three. */
  colour: string;
  saved: boolean;
  onListen: () => void;
  onSlow: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const t = useT();
  // Keyboard users arrive on the card when they open it, and press Escape to leave.
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { close.current?.focus({ preventScroll: true }); }, [word]);
  return (
    <div role="dialog" aria-label={word} className="dock-up relative">
      <button ref={close} type="button" onClick={onClose} aria-label={t("reader.closeCard")} className="absolute -top-2 end-0 grid size-11 place-items-center rounded-full active:bg-border/60">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      {/* The English for the word, large; under it one line on when it is used. The Spanish stays in the text above. */}
      <h2 className="pe-9 font-reading text-[24px] font-semibold leading-tight" style={{ color: colour }}><span lang="en" dir="ltr" className="block">{entry ? entry.en : word}</span></h2>
      <p className="mt-1.5 text-[14.5px] font-semibold leading-snug"><span lang="en" dir="ltr" className="block">{entry ? entry.use : t("reader.noMeaning")}</span></p>
      <div className="mt-2.5 flex gap-1.5">
        <button type="button" onClick={onListen} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-border text-[12.5px] font-bold active:bg-border/50">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7" /></svg>
          {t("reader.listen")}
        </button>
        <button type="button" onClick={onSlow} className="flex min-h-11 flex-1 items-center justify-center rounded-xl border-[1.5px] border-border px-1 py-1 text-center leading-tight text-[12.5px] font-bold active:bg-border/50">{t("reader.slowly")}</button>
        <button type="button" onClick={onSave} aria-pressed={saved}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-xl border-[1.5px] px-1 py-1 text-center text-[12.5px] font-bold leading-tight ${saved ? "border-accent-bright/30 bg-accent-bright/25" : "border-accent-bright bg-accent-bright text-foreground"}`}>
          {saved ? t("reader.saved") : t("reader.save")}
        </button>
      </div>
    </div>
  );
}

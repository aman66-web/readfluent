"use client";

import { useT } from "@/lib/i18n/react";
import type { WordEntry } from "@/lib/preview/spanish";

/**
 * The word card at the foot of the reader: the word in its colour, how to say it where that is
 * known, one line of English — what it means and when it is used — and three buttons: hear it,
 * hear it slowly, save it for the flashcards.
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
  return (
    <div role="dialog" aria-label={word} className="dock-up relative">
      <button type="button" onClick={onClose} aria-label={t("reader.closeCard")} className="absolute -top-1 end-0 grid size-9 place-items-center rounded-full active:bg-border/60">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div className="flex flex-wrap items-baseline gap-x-2 pe-9">
        <h2 className="font-reading text-[24px] font-semibold leading-tight" style={{ color: colour }}>{word}</h2>
        {entry?.ph && <span className="text-[13px] text-muted">{entry.ph}</span>}
      </div>
      {/* One line of English: what it means, and when it is used. */}
      <p className="mt-1.5 text-[14.5px] font-semibold leading-snug">{entry ? entry.mean : t("reader.noMeaning")}</p>
      <div className="mt-2.5 flex gap-1.5">
        <button type="button" onClick={onListen} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-border text-[12.5px] font-bold active:bg-border/50">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7" /></svg>
          {t("reader.listen")}
        </button>
        <button type="button" onClick={onSlow} className="flex h-9 flex-1 items-center justify-center rounded-xl border-[1.5px] border-border px-1 text-[12.5px] font-bold active:bg-border/50">{t("reader.slowly")}</button>
        <button type="button" onClick={onSave} aria-pressed={saved}
                className={`flex h-9 flex-1 items-center justify-center rounded-xl border-[1.5px] px-1 text-[12.5px] font-bold ${saved ? "border-accent-bright/30 bg-accent-bright/25" : "border-accent-bright bg-accent-bright text-foreground"}`}>
          {saved ? t("reader.saved") : t("reader.save")}
        </button>
      </div>
    </div>
  );
}

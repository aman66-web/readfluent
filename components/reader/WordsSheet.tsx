"use client";

import { useT } from "@/lib/i18n/react";
import type { Saved } from "@/lib/words/saved";

/** The words saved so far, as a sheet from the foot of the reader: each with its meaning and a way to take it out again. */
export function WordsSheet({ saved, onRemove, onClose }: { saved: Saved; onRemove: (id: string) => void; onClose: () => void }) {
  const t = useT();
  const entries = Object.entries(saved).sort((a, b) => b[1].at - a[1].at);
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end" role="dialog" aria-label={t("reader.yourWords")}>
      <button type="button" aria-label={t("reader.close")} onClick={onClose} className="fade-in absolute inset-0 bg-foreground/45" />
      <div className="sheet-up safe-bottom relative flex max-h-[70%] flex-col rounded-t-[26px] bg-background px-5 [--pb:1rem] pt-4">
        <h2 className="text-[18px] font-bold">{t("reader.yourWords")}</h2>
        <p className="mb-3 text-[13px] leading-snug text-muted">{t("reader.yourWordsSub")}</p>
        {entries.length === 0 ? (
          <p className="py-2 text-[13px] text-muted">{t("reader.noneSaved")}</p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
            {entries.map(([id, w]) => (
              <li key={id} className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-reading text-[17px] font-semibold">{w.word}</p>
                  {w.meaning && <p className="text-[12.5px] text-muted">{w.meaning}</p>}
                </div>
                <button type="button" onClick={() => onRemove(id)} aria-label={t("reader.removeWord", { word: w.word })} className="grid size-11 shrink-0 place-items-center rounded-full active:bg-border/60">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

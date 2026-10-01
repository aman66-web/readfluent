"use client";

import { useT } from "@/lib/i18n/react";
import { TEXT_SIZES, savePrefs, type ReaderPrefs, type TextSize } from "@/lib/reading/prefs";

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 py-2.5 text-start text-[14px] font-semibold">
      {label}
      <span className={`relative h-[26px] w-[42px] shrink-0 rounded-full transition-colors ${on ? "bg-accent-bright" : "bg-border"}`} aria-hidden>
        <span className={`absolute start-[3px] top-[3px] size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4 rtl:-translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

/** What the "Aa" button opens: the size of the text, the underlined key words, the translation under each page. */
export function Settings({ prefs, language }: { prefs: ReaderPrefs; language: string }) {
  const t = useT();
  const sizes: TextSize[] = ["s", "m", "l"];
  return (
    <div role="dialog" aria-label={t("reader.settings")} className="fade-in absolute end-2.5 top-[54px] z-10 w-[min(300px,calc(100%-20px))] rounded-[18px] border border-border bg-background p-3.5 shadow-[0_14px_40px_rgba(0,0,0,.2)]">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t("reader.textSize")}</p>
      <div className="mb-3 flex gap-1.5">
        {sizes.map((s) => (
          <button key={s} type="button" aria-pressed={prefs.size === s} onClick={() => savePrefs({ size: s })}
                  className={`h-10 flex-1 rounded-xl border-[1.5px] font-reading font-semibold ${prefs.size === s ? "border-accent-bright bg-accent-bright/25" : "border-border"}`}
                  style={{ fontSize: TEXT_SIZES[s] - 2 }}>
            Aa
          </button>
        ))}
      </div>
      <Switch on={prefs.colours} label={t("reader.underline")} onChange={(colours) => savePrefs({ colours })} />
      <Switch on={prefs.gloss} label={t("reader.glossUnder", { language })} onChange={(gloss) => savePrefs({ gloss })} />
    </div>
  );
}

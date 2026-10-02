"use client";

import { languageName } from "@/lib/i18n";
import { useState } from "react";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { CEFR, type Cefr } from "@/lib/xp/levels";
import { GuideFrame, GuideHead, useGuide } from "./Guide";

/** The six levels in the three bands the books are written in. */
const BANDS = [
  { id: "A1A2", label: "A1–A2", levels: ["A1", "A2"] },
  { id: "B1B2", label: "B1–B2", levels: ["B1", "B2"] },
  { id: "C1C2", label: "C1–C2", levels: ["C1", "C2"] },
] as const satisfies readonly { id: string; label: string; levels: readonly Cefr[] }[];

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/** Six bars of rising height, the first `n` lit: a level as a picture. */
function Steps({ n }: { n: number }) {
  return (
    <span className="flex h-6 shrink-0 items-end gap-[3px]" aria-hidden>
      {CEFR.map((_, i) => (
        <span key={i} className="w-[5px] rounded-full" style={{ height: `${28 + i * 14}%`, background: i < n ? "var(--ob-teal)" : "rgba(11,27,34,.14)" }} />
      ))}
    </span>
  );
}

/**
 * "How much {language} do you already know?" — said in the language's own standard scale,
 * A1 to C2 (the CEFR), which a short card explains: they pick one of the six levels. The level
 * test is offered at the end of the first run instead (the ready screen), where they can keep
 * what they picked or let the test place them. The level is where their XP starts (lib/xp).
 */
export function LevelScreen({ at, of, learn, value, placed, onPick, onBack, onContinue }: Nav & {
  learn: LanguageCode | null;
  value: Cefr | null;
  placed: boolean;
  onPick: (level: Cefr) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const language = languageName(learn ?? "en", locale);
  const line = t("level.line", { language });
  const guide = useGuide(line);
  const [about, setAbout] = useState(false);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={value !== null}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 pt-5">
        <GuideHead key={line} guide={guide} line={line} mood="reading" />

        {/* What the six levels are, and how widely they are used: one line until asked. */}
        <div className="wel-in mt-4 shrink-0 overflow-hidden rounded-[16px] bg-[var(--ob-cyan)]/15" style={{ animationDelay: "700ms" }}>
          <button type="button" onClick={() => setAbout((o) => !o)} aria-expanded={about}
                  className="flex min-h-12 w-full items-center gap-2.5 px-3.5 text-start text-[13.5px] font-bold text-[var(--ob-deep)]">
            <span className="rounded-md bg-[var(--ob-deep)] px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white" aria-hidden>CEFR</span>
            <span className="min-w-0 flex-1">{t("level.aboutTitle")}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`size-4 shrink-0 transition-transform ${about ? "rotate-180" : ""}`} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {about && <p className="px-3.5 pb-3.5 text-[13px] leading-snug text-[var(--ob-ink)]/80">{t("level.about")}</p>}
        </div>

        <div className="wel-in mt-5" style={{ animationDelay: "800ms" }}>
          <h2 className="text-[18px] font-semibold leading-tight">{t("level.opt1Title")}</h2>
          <p className="ob-muted mt-1 text-[13px] leading-snug">{t("level.opt1Sub")}</p>
        </div>

        {/* Three bands of two, the same three the books come in. */}
        <div className="mt-3 flex flex-col gap-4" role="group" aria-label={t("level.opt1Title")}>
          {BANDS.map((band, b) => (
            <section key={band.id} className="wel-in" style={{ animationDelay: `${860 + b * 120}ms` }}>
              <h3 className="mb-1.5 flex items-baseline gap-2 px-0.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ob-deep)]">
                <span dir="ltr">{band.label}</span><span className="ob-muted normal-case tracking-normal">{t(`level.${band.id}.name`)}</span>
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {band.levels.map((id) => {
                  const on = value === id;
                  const i = CEFR.indexOf(id);
                  return (
                    <button key={id} type="button" aria-pressed={on} onClick={() => onPick(id)}
                            className={`guide-card relative flex min-h-[112px] flex-col rounded-[18px] p-3.5 text-start ${on ? "guide-card-on" : ""}`}>
                      <span className="flex items-center justify-between">
                        <span className="tabular text-[24px] font-extrabold leading-none tracking-[-0.02em] text-[var(--ob-deep)]">{id}</span>
                        <Steps n={i + 1} />
                      </span>
                      <span className="mt-2.5 block text-[14.5px] font-semibold leading-tight">{t(`level.${id}.title`)}</span>
                      <span className="ob-muted mt-1 block text-[12px] leading-snug">{t(`level.${id}.desc`)}</span>
                      {on && placed && <span className="mt-2 w-fit rounded-full bg-[var(--ob-teal)] px-2 py-0.5 text-[10.5px] font-bold text-white">{t("level.placed")}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

      </div>
    </GuideFrame>
  );
}

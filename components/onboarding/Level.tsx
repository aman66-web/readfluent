"use client";

import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { CEFR, type Cefr } from "@/lib/xp/levels";
import { GuideFrame, GuideHead, useGuide } from "./Guide";

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
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={value !== null}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 pt-5">
        <GuideHead key={line} guide={guide} line={line} mood="reading" />

        {/* What the six levels are, and how widely they are used. */}
        <div className="wel-in mt-4 rounded-[18px] bg-[var(--ob-cyan)]/15 p-4" style={{ animationDelay: "700ms" }}>
          <p className="flex items-center gap-2 text-[13px] font-bold text-[var(--ob-deep)]">
            <span className="rounded-md bg-[var(--ob-deep)] px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white" aria-hidden>CEFR</span>
            {t("level.aboutTitle")}
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-[var(--ob-ink)]/80">{t("level.about")}</p>
        </div>

        <div className="wel-in mt-5" style={{ animationDelay: "800ms" }}>
          <h2 className="text-[17px] font-semibold leading-tight">{t("level.opt1Title")}</h2>
          <p className="ob-muted mt-1 text-[13px] leading-snug">{t("level.opt1Sub")}</p>
        </div>
        <div className="mt-3 flex flex-col gap-2" role="group" aria-label={t("level.opt1Title")}>
          {CEFR.map((id, i) => {
            const on = value === id;
            return (
              <button key={id} type="button" aria-pressed={on} onClick={() => onPick(id)}
                      className={`guide-card wel-in relative flex min-h-[58px] items-center gap-3.5 rounded-[18px] px-4 py-2.5 text-start ${on ? "guide-card-on" : ""}`}
                      style={{ animationDelay: `${860 + i * 55}ms` }}>
                <span className="tabular w-8 shrink-0 text-[15px] font-extrabold text-[var(--ob-deep)]">{id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-tight">{t(`level.${id}.title`)}</span>
                  <span className="ob-muted mt-0.5 block text-[12.5px] leading-snug">{t(`level.${id}.desc`)}</span>
                </span>
                {on && placed && <span className="shrink-0 rounded-full bg-[var(--ob-teal)] px-2 py-0.5 text-[10.5px] font-bold text-white">{t("level.placed")}</span>}
                <Steps n={i + 1} />
              </button>
            );
          })}
        </div>

      </div>
    </GuideFrame>
  );
}

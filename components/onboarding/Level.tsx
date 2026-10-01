"use client";

import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { hasPlacement } from "@/lib/placement";
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

/** "Option 1" / "Option 2": a small numbered label above a block, with its title and a line of help. */
function Option({ n, kicker, title, sub, delay }: { n: 1 | 2; kicker: string; title: string; sub: string; delay: number }) {
  return (
    <div className="wel-in flex items-start gap-3" style={{ animationDelay: `${delay}ms` }}>
      <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ob-teal)] text-[13px] font-extrabold text-white" aria-hidden>{n}</span>
      <div className="min-w-0">
        <p className="ob-muted text-[11px] font-bold uppercase tracking-[0.1em]">{kicker}</p>
        <h2 className="text-[17px] font-semibold leading-tight">{title}</h2>
        <p className="ob-muted mt-1 text-[13px] leading-snug">{sub}</p>
      </div>
    </div>
  );
}

/**
 * "How much {language} do you already know?" — said in the language's own standard scale,
 * A1 to C2 (the CEFR), which a short card explains, and in two clear options: (1) pick one
 * of the six levels, or (2) not knowing which, take a five-minute test (/placement). The
 * level they choose, or the test gives, is where their XP starts (lib/xp). Where there is no
 * test yet for the language, option 2 says so instead of leading to nothing.
 */
export function LevelScreen({ at, of, learn, value, placed, onPick, onTest, onBack, onContinue }: Nav & {
  learn: LanguageCode | null;
  value: Cefr | null;
  placed: boolean;
  onPick: (level: Cefr) => void;
  onTest: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const language = languageName(learn ?? "en", locale);
  const line = t("level.line", { language });
  const guide = useGuide(line);
  const canTest = hasPlacement(learn);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={value !== null}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 pt-5">
        <GuideHead key={line} guide={guide} line={line} />

        {/* What the six levels are, and how widely they are used. */}
        <div className="wel-in mt-4 rounded-[18px] bg-[var(--ob-cyan)]/15 p-4" style={{ animationDelay: "700ms" }}>
          <p className="flex items-center gap-2 text-[13px] font-bold text-[var(--ob-deep)]">
            <span className="rounded-md bg-[var(--ob-deep)] px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white" aria-hidden>CEFR</span>
            {t("level.aboutTitle")}
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-[var(--ob-ink)]/80">{t("level.about")}</p>
        </div>

        <div className="mt-5">
          <Option n={1} kicker={t("level.opt1")} title={t("level.opt1Title")} sub={t("level.opt1Sub")} delay={800} />
        </div>
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label={t("level.opt1Title")}>
          {CEFR.map((id, i) => {
            const on = value === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onPick(id)}
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

        <div className="mt-6 border-t border-[var(--ob-line)] pt-5">
          <Option n={2} kicker={t("level.opt2")} title={t("level.opt2Title")} sub={t("level.opt2Sub")} delay={1250} />
          {canTest ? (
            <button type="button" onClick={onTest}
                    className="guide-card wel-in relative mt-3 flex w-full items-center gap-3.5 rounded-[18px] px-4 py-3 text-start"
                    style={{ animationDelay: "1300ms" }}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--ob-cyan)]/25 text-[var(--ob-deep)]" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-tight">{t("level.testButton")}</span>
                <span className="ob-muted mt-0.5 block text-[12.5px] leading-snug">{t("level.testSub")}</span>
              </span>
            </button>
          ) : (
            <p className="ob-muted wel-in mt-3 rounded-[14px] bg-[var(--ob-card)] px-4 py-3 text-[12.5px] leading-snug" style={{ animationDelay: "1300ms" }}>{t("level.testSoon", { language })}</p>
          )}
        </div>
      </div>
    </GuideFrame>
  );
}

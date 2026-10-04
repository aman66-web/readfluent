"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { useAnswers } from "@/lib/onboarding/use-answers";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { runSwitch, STEPS, type StepId, type StepState, type SwitchResult } from "@/lib/translate/switching";

const LABEL: Record<StepId, MessageId> = {
  progress: "langSwitch.step.progress", decks: "langSwitch.step.decks", tests: "langSwitch.step.tests", translator: "langSwitch.step.translator", books: "langSwitch.step.books",
};

/**
 * The screen that holds the app while a new language to learn is set up: what is being done, step by step, and a bar that fills.
 * It opens over everything; the reader can go on only when it is done (or, if the phone's own download is slow, choose to
 * carry on while it finishes). See lib/translate/switching.ts for what each step does.
 */
export function LanguageSwitching({ lang, onClose }: { lang: LanguageCode; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const a = useAnswers();
  const language = languageName(lang, locale);
  const [steps, setSteps] = useState<Record<StepId, StepState>>(() => Object.fromEntries(STEPS.map((s) => [s, "wait"])) as Record<StepId, StepState>);
  const [result, setResult] = useState<SwitchResult | null>(null);
  const [slow, setSlow] = useState(false);
  const live = useRef(true);
  const started = useRef(false);
  const interests = useRef(a.interests);
  const level = useRef(a.level);

  useEffect(() => {
    live.current = true;
    if (!started.current) {
      started.current = true;
      void runSwitch(lang, {
        level: level.current, liked: interests.current, live: () => live.current,
        onStep: (id, state) => { if (live.current) setSteps((s) => ({ ...s, [id]: state })); },
      }).then((r) => { if (live.current) setResult(r); });
    }
    return () => { live.current = false; };
  }, [lang]);

  // The phone's own download can take a while: after a bit, the reader may carry on while it finishes.
  useEffect(() => {
    if (steps.translator !== "active") return;
    const id = window.setTimeout(() => setSlow(true), 15_000);
    return () => window.clearTimeout(id);
  }, [steps.translator]);

  const finished = STEPS.filter((s) => steps[s] !== "wait" && steps[s] !== "active").length;
  const done = result !== null;
  const pct = done ? 100 : Math.round(((finished + (STEPS.some((s) => steps[s] === "active") ? 0.5 : 0)) / STEPS.length) * 100);
  const go = () => { onClose(); router.push("/"); };

  return (
    <div role="dialog" aria-modal="true" aria-busy={!done} aria-label={t("langSwitch.title", { language })} className="ob fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]" data-switching={lang}>
      <div className="flex flex-1 flex-col justify-center">
        <Mascot mood={done ? "cheer" : "reading"} className="mx-auto block h-[130px] w-auto" />
        <h1 className="mt-4 text-center text-[26px] font-bold leading-tight tracking-[-0.02em]">{done ? t("langSwitch.done") : t("langSwitch.title", { language })}</h1>
        <p className="ob-muted mx-auto mt-2 max-w-[21rem] text-center text-[14.5px] leading-snug">{done ? t("langSwitch.doneSub", { language }) : t("langSwitch.sub")}</p>

        <div className="mx-auto mt-6 h-2.5 w-full max-w-[22rem] overflow-hidden rounded-full bg-[var(--ob-track)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>

        <ul className="mx-auto mt-5 grid w-full max-w-[22rem] gap-2.5" aria-live="polite">
          {STEPS.map((s) => {
            const st = steps[s];
            return (
              <li key={s} className={`flex items-center gap-3 text-[15px] leading-snug transition-opacity ${st === "wait" ? "opacity-45" : ""}`} data-step={s} data-state={st}>
                <span aria-hidden className="grid size-6 shrink-0 place-items-center">
                  {st === "active" ? <span className="block size-5 animate-spin rounded-full border-2 border-black/15 border-t-[var(--ob-teal)]" />
                    : st === "done" ? <span className="grid size-6 place-items-center rounded-full bg-emerald-500 text-[13px] font-bold text-white">✓</span>
                    : st === "skipped" ? <span className="grid size-6 place-items-center rounded-full bg-black/15 text-[13px] font-bold text-white">–</span>
                    : st === "failed" ? <span className="grid size-6 place-items-center rounded-full bg-amber-500 text-[13px] font-bold text-white">!</span>
                    : <span className="block size-3 rounded-full bg-black/15" />}
                </span>
                <span className={st === "active" ? "font-semibold" : ""}>{t(LABEL[s], { language })}</span>
              </li>
            );
          })}
        </ul>

        {steps.translator === "active" && <p className="ob-muted mx-auto mt-4 max-w-[21rem] text-center text-[13px] leading-snug">{t("langSwitch.translator.wait")}</p>}
        {done && result.translator === "unsupported" && <p className="ob-muted mx-auto mt-4 max-w-[21rem] text-center text-[13px] leading-snug">{t("langSwitch.translator.skip", { language })}</p>}
        {done && result.offline && <p className="ob-muted mx-auto mt-3 max-w-[21rem] text-center text-[13px] leading-snug">{t("langSwitch.offline")}</p>}
      </div>
      {done ? (
        <button type="button" onClick={go} className="btn-cyan mx-auto h-14 w-full max-w-[22rem] rounded-full text-[16px] font-bold">{t("langSwitch.start")}</button>
      ) : slow ? (
        <button type="button" onClick={go} className="mx-auto h-12 text-[15px] font-semibold text-[var(--ob-deep)]">{t("langSwitch.continueAnyway")}</button>
      ) : null}
    </div>
  );
}

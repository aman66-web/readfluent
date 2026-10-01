"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DotNumber } from "@/components/DotMatrix";
import { PrimaryButton } from "@/components/onboarding/ui";
import { useT } from "@/lib/i18n/react";
import { saveAnswers } from "@/lib/onboarding/answers";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { AFTER_PLACEMENT, BACK_FROM_PLACEMENT } from "@/lib/onboarding/steps";
import { answer, isDone, newState, nextItem, progressOf, resultOf, shuffled, type Item, type State } from "@/lib/placement/engine";
import { bankFor } from "@/lib/placement";
import type { Cefr } from "@/lib/xp/levels";

/**
 * The placement test: intro, then one question at a time, then the level it found.
 * Nothing says whether an answer was right until the end. Choosing an answer moves on
 * by itself; "I don't know" counts as wrong, which is better for the result than a guess.
 */
export function Placement() {
  const t = useT();
  const router = useRouter();
  const { learn } = useAnswers();
  const bank = useMemo(() => bankFor(learn), [learn]);
  const [phase, setPhase] = useState<"intro" | "ask" | "result">("intro");
  const [state, setState] = useState<State>(newState);
  const [item, setItem] = useState<Item | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<Cefr | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // A language with no test has nothing to do here: back to the question that sent them.
  useEffect(() => { if (bank === null) router.replace(BACK_FROM_PLACEMENT); }, [bank, router]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!bank) return null;

  const begin = () => {
    const first = nextItem(newState(), bank);
    setState(newState());
    setItem(first ? shuffled(first) : null);
    setChosen(null);
    setResult(null);
    setPhase("ask");
  };

  const reply = (index: number | null) => {
    if (!item || chosen !== null) return;
    setChosen(index ?? -1);
    timer.current = window.setTimeout(() => {
      const next = answer(state, item, index !== null && index === item.answer);
      setState(next);
      setChosen(null);
      if (isDone(next, bank.length)) {
        setResult(resultOf(next));
        setItem(null);
        setPhase("result");
        return;
      }
      const upcoming = nextItem(next, bank);
      setItem(upcoming ? shuffled(upcoming) : null);
    }, index === null ? 120 : 380);
  };

  const leave = () => router.replace(BACK_FROM_PLACEMENT);
  const use = () => {
    if (!result) return;
    saveAnswers({ level: result, placed: true });
    router.replace(AFTER_PLACEMENT);
  };

  const bar = phase === "result" ? 1 : progressOf(state, bank.length);

  return (
    <main className="ob relative flex h-[100dvh] flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" onClick={leave} aria-label={t("placement.leave")}
                className="-ms-2.5 grid size-11 shrink-0 place-items-center rounded-full transition-colors active:bg-black/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="guide-track h-[5px] flex-1 overflow-hidden rounded-full" role="progressbar" aria-label={t("placement.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(bar * 100)}>
          <div className="guide-step h-full origin-left rounded-full transition-transform duration-500 rtl:origin-right" style={{ transform: `scaleX(${bar})` }} />
        </div>
        <span className="size-11 shrink-0" aria-hidden />
      </div>

      {phase === "intro" && (
        <>
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto pb-4">
            <h1 className="text-[32px] font-light leading-[1.1] tracking-[-0.025em]">{t("placement.title")}</h1>
            <p className="ob-muted mt-4 text-[17px] leading-snug">{t("placement.intro")}</p>
            <p className="ob-muted mt-3 text-[15px] leading-snug">{t("placement.intro2")}</p>
          </div>
          <PrimaryButton onClick={begin}>{t("placement.start")}</PrimaryButton>
        </>
      )}

      {phase === "ask" && item && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-3 pt-6" dir="ltr" key={item.id}>
          <p className="ob-muted text-[13px] font-semibold uppercase tracking-[0.08em]" dir="auto">{t("placement.question", { n: state.history.length + 1 })}</p>
          {item.passage && (
            <div className="guide-card relative mt-3 rounded-[18px] p-4">
              <p className="ob-muted text-[11px] font-bold uppercase tracking-[0.1em]" dir="auto">{t("placement.read")}</p>
              <p className="ed-serif mt-1.5 text-[17px] leading-snug">{item.passage}</p>
            </div>
          )}
          <h1 className="mt-4 text-[23px] font-medium leading-[1.25] tracking-[-0.015em]">{item.prompt}</h1>
          <div className="mt-5 flex flex-col gap-2.5" role="group" aria-label={item.prompt}>
            {item.options.map((o, i) => (
              <button key={o} type="button" aria-pressed={chosen === i} onClick={() => reply(i)} disabled={chosen !== null}
                      className={`guide-card wel-in relative min-h-[54px] rounded-[16px] px-4 py-3 text-start text-[16px] font-semibold leading-snug ${chosen === i ? "guide-card-on" : ""}`}
                      style={{ animationDelay: `${i * 50}ms` }}>
                {o}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => reply(null)} disabled={chosen !== null}
                  className="ob-muted mt-3 h-12 w-full text-[14px] font-semibold" dir="auto">
            {t("placement.dontKnow")}
          </button>
        </div>
      )}

      {phase === "result" && result && (
        <>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto pb-4 text-center">
            <div dir="ltr"><DotNumber value={result} cell={11} color="#0891B2" glow={false} field fieldColor="rgba(14,116,144,.07)" label={result} /></div>
            <h1 className="mt-7 text-[26px] font-light leading-tight tracking-[-0.02em]">{t("placement.result", { level: result })}</h1>
            <p className="ob-muted mt-3 max-w-[22rem] text-[15px] leading-snug">{t("placement.resultSub", { name: t(`levelname.${result}`) })}</p>
          </div>
          <PrimaryButton onClick={use}>{t("placement.use", { level: result })}</PrimaryButton>
          <button type="button" onClick={begin} className="ob-muted mt-1 h-12 w-full text-[14px] font-semibold">{t("placement.again")}</button>
        </>
      )}
    </main>
  );
}

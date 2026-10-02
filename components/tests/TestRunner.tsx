"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { Mascot } from "@/components/mascot/Mascot";
import { LevelUp } from "@/components/xp/LevelUp";
import { useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { canSpeak, speak, stopSpeaking } from "@/lib/reading/speak";
import { saveResult } from "@/lib/tests/store";
import type { Paper, Question, TestKind } from "@/lib/tests/types";
import { XP, levelUpBetween, type Cefr, type LevelUp as LevelUpInfo } from "@/lib/xp/levels";
import { awardTestAnswer, awardTestFinish, currentXp } from "@/lib/xp/ledger";

const PROMPT: Record<Question["kind"], MessageId> = {
  vocab: "tests.prompt.vocab", gap: "tests.prompt.gap", meaning: "tests.prompt.meaning", order: "tests.prompt.order", listen: "tests.prompt.listen",
};

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Speaker = () => <svg viewBox="0 0 24 24" className="size-7" {...stroke} aria-hidden><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>;

/**
 * One test: ten questions, one at a time. Pick (or tap the words into order), Check, and the right answer is
 * shown with what it means; each one right earns XP at once, and a finished test with a pass adds a bonus. A
 * wrong answer earns nothing. The paper comes from /api/tests (no model: lib/tests/build.ts).
 */
export function TestRunner({ level, kind }: { level: Cefr; kind: TestKind }) {
  const a = useAnswers();
  const [round, setRound] = useState(0);
  // A fresh loader for each language, level, kind and "try again", so each starts from "loading".
  return <Loader key={`${a.learn}:${level}:${kind}:${round}`} lang={a.learn} level={level} kind={kind} round={round} onAgain={() => setRound((n) => n + 1)} />;
}

function Loader({ lang, level, kind, round, onAgain }: { lang: string | null; level: Cefr; kind: TestKind; round: number; onAgain: () => void }) {
  const t = useT();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!lang) return;
    let live = true;
    fetch(`/api/tests?lang=${lang}&level=${level}&kind=${kind}&seed=${Date.now() + round}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { paper: Paper }) => {
        if (!live) return;
        // A listening question needs a voice: without one it is left out.
        const questions = d.paper.questions.filter((q) => q.kind !== "listen" || canSpeak());
        if (questions.length < 3) setFailed(true); else setPaper({ ...d.paper, questions });
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; stopSpeaking(); };
  }, [lang, level, kind, round]);

  const back = (
    <BackLink fallback="/recall/tests" label={t("tests.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
    </BackLink>
  );

  if (!lang || failed) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="sleepy" className="block h-[130px] w-auto" />
          <p className="mt-4 max-w-[17rem] text-[15.5px] leading-snug text-muted">{t(lang ? "tests.error" : "tests.pickLanguage")}</p>
          {lang && <button type="button" onClick={onAgain} className="btn-cyan mt-5 h-12 rounded-full px-7 text-[15px] font-bold">{t("tests.retry")}</button>}
        </div>
      </main>
    );
  }
  if (!paper) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="reading" className="block h-[130px] w-auto" />
          <p className="mt-4 text-[15.5px] text-muted" aria-live="polite">{t("tests.loading")}</p>
        </div>
      </main>
    );
  }
  return <Run paper={paper} level={level} kind={kind} lang={lang} back={back} onAgain={onAgain} />;
}

function Run({ paper, level, kind, lang, back, onAgain }: { paper: Paper; level: Cefr; kind: TestKind; lang: string; back: React.ReactNode; onAgain: () => void }) {
  const t = useT();
  const qs = paper.questions;
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [tapped, setTapped] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [right, setRight] = useState(0);
  const [earned, setEarned] = useState(0);
  const [gain, setGain] = useState<{ n: number; xp: number } | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);
  const [finishXp, setFinishXp] = useState<number | null>(null);
  const q = qs[at];
  const done = at >= qs.length;

  useEffect(() => {
    if (!gain) return;
    const id = window.setTimeout(() => setGain(null), 1200);
    return () => window.clearTimeout(id);
  }, [gain]);

  // A listening question says itself when it comes up.
  useEffect(() => {
    if (q?.kind === "listen" && q.say) speak(q.say, lang, 0.95);
    return () => stopSpeaking();
  }, [q, lang]);

  const isRight = useMemo(() => {
    if (!q || !checked) return false;
    if (q.kind === "order") return tapped.map((i) => q.words![i]).join(" ") === q.solution!.join(" ");
    return picked === q.answer;
  }, [q, checked, picked, tapped]);

  const check = useCallback(() => {
    if (!q) return;
    const ok = q.kind === "order" ? tapped.map((i) => q.words![i]).join(" ") === q.solution!.join(" ") : picked === q.answer;
    setChecked(true);
    if (ok) {
      setRight((n) => n + 1);
      const before = currentXp();
      const xp = awardTestAnswer(level);
      if (xp > 0) {
        setEarned((n) => n + xp);
        setGain({ n: Date.now(), xp });
        const up = levelUpBetween(before, currentXp());
        if (up) setLevelUp(up);
      }
    }
  }, [q, tapped, picked, level]);

  const next = useCallback(() => {
    stopSpeaking();
    const last = at + 1 >= qs.length;
    if (last) {
      const before = currentXp();
      const xp = awardTestFinish(level, right, qs.length);
      saveResult(lang, level, kind, right, qs.length);
      setFinishXp(xp);
      setEarned((n) => n + xp);
      const up = levelUpBetween(before, currentXp());
      if (up) setLevelUp(up);
    }
    setAt((n) => n + 1); setPicked(null); setTapped([]); setChecked(false);
  }, [at, qs.length, level, right, lang, kind]);

  if (done) {
    const share = right / qs.length;
    const passed = share >= XP.test.passShare;
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood={passed ? "cheer" : "hello"} className="block h-[150px] w-auto" />
          <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{level}</p>
          <h1 className="tabular mt-1 text-[56px] font-extrabold leading-none tracking-[-0.03em]">{right}<span className="text-[28px] font-bold text-faint">/{qs.length}</span></h1>
          <p className="mt-3 text-[19px] font-bold">{t(passed ? "tests.passed" : "tests.notPassed", { pass: Math.round(XP.test.passShare * 100) })}</p>
          <p className="tabular mt-3 inline-flex rounded-full bg-accent-bright px-4 py-1.5 text-[15px] font-bold text-on-cyan">{t("tests.xpEarned", { xp: earned })}</p>
          {finishXp !== null && finishXp > 0 && <p className="mt-2 text-[13px] text-muted">{t("tests.bonus", { xp: finishXp })}</p>}
        </div>
        <button type="button" onClick={onAgain} className="btn-cyan h-14 rounded-full text-[16px] font-bold">{t("tests.retry")}</button>
        <BackLink fallback="/recall/tests" className="mt-1 flex h-12 items-center justify-center text-[15px] font-semibold text-[var(--ob-deep)]">{t("tests.back")}</BackLink>
        {levelUp && <LevelUp up={levelUp} onClose={() => setLevelUp(null)} />}
      </main>
    );
  }

  const canCheck = q.kind === "order" ? tapped.length === q.words!.length : picked !== null;
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.25rem] [--pt:.5rem]">
      <div className="flex items-center gap-3">
        {back}
        <div role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={at} aria-label={t("tests.question", { n: at + 1, total: qs.length })} className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ob-track)]">
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-300" style={{ width: `${(at / qs.length) * 100}%` }} />
        </div>
        <span className="tabular w-12 text-end text-[13px] font-semibold text-muted">{at + 1}/{qs.length}</span>
      </div>

      <div className="relative flex flex-1 flex-col justify-center py-5">
        {gain && (
          <p key={gain.n} className="xp-pop tabular pointer-events-none absolute inset-x-0 top-0 mx-auto w-fit rounded-full bg-accent-bright px-3.5 py-1 text-[14px] font-bold text-on-cyan shadow-md" role="status"><bdi>{t("reader.xp", { xp: gain.xp })}</bdi></p>
        )}
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{t(PROMPT[q.kind])}</p>

        {q.kind === "listen" ? (
          <button type="button" onClick={() => q.say && speak(q.say, lang, 0.95)} aria-label={t("reader.listenPage")} className="btn-cyan mt-4 grid size-20 place-items-center self-start rounded-full"><Speaker /></button>
        ) : (
          <p lang={lang} dir="auto" className={`font-reading mt-3 font-bold leading-snug tracking-[-0.015em] ${q.kind === "vocab" ? "text-[34px]" : "text-[23px]"}`}>
            {q.kind === "order" ? <span className="text-[16px] font-medium text-muted" dir="auto">{q.prompt}</span> : q.prompt}
          </p>
        )}

        {q.kind === "order" ? (
          <div className="mt-5">
            <div lang={lang} dir="auto" className="flex min-h-[3.75rem] flex-wrap gap-2 rounded-2xl border-2 border-dashed border-[var(--ob-line)] p-2.5">
              {tapped.map((i, n) => (
                <button key={n} type="button" disabled={checked} onClick={() => setTapped((cur) => cur.filter((_, k) => k !== n))} className="opt-on opt h-11 rounded-xl px-3.5 text-[17px] font-semibold">{q.words![i]}</button>
              ))}
            </div>
            <div lang={lang} dir="auto" className="mt-4 flex flex-wrap gap-2">
              {q.words!.map((w, i) => (
                <button key={i} type="button" disabled={checked || tapped.includes(i)} onClick={() => setTapped((cur) => [...cur, i])} className="opt h-11 rounded-xl px-3.5 text-[17px] font-semibold disabled:opacity-30">{w}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-2.5" role="radiogroup">
            {q.options!.map((o, i) => {
              const on = picked === i;
              const good = checked && i === q.answer;
              const bad = checked && on && i !== q.answer;
              return (
                <button key={i} type="button" role="radio" aria-checked={on} aria-disabled={checked} onClick={() => { if (!checked) setPicked(i); }}
                        lang={q.kind === "gap" ? lang : q.kind === "listen" && !q.reveal?.en ? lang : undefined} dir="auto"
                        className={`opt min-h-14 rounded-2xl px-4 py-3 text-start text-[16.5px] font-semibold leading-snug ${on && !checked ? "opt-on" : ""} ${good ? "!bg-emerald-50 [&::after]:!shadow-[inset_0_0_0_2px_#10b981]" : ""} ${bad ? "!bg-rose-50 [&::after]:!shadow-[inset_0_0_0_2px_#f43f5e]" : ""}`}>
                  {o}
                </button>
              );
            })}
          </div>
        )}

        {checked && (
          <div role="status" className={`mt-4 rounded-2xl p-3.5 text-[14.5px] leading-snug ${isRight ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
            <p className="font-bold">{t(isRight ? "tests.right" : "tests.wrong")}</p>
            {q.reveal && (
              <p className="mt-1">
                <span lang={lang} dir="auto" className="font-semibold">{q.reveal.text}</span>
                {q.reveal.en ? <span dir="auto"> · {q.reveal.en}</span> : null}
              </p>
            )}
          </div>
        )}
      </div>

      {checked
        ? <button type="button" onClick={next} className="btn-cyan h-14 rounded-full text-[16px] font-bold">{t(at + 1 >= qs.length ? "tests.finish" : "tests.next")}</button>
        : <button type="button" onClick={check} disabled={!canCheck} className="btn-cyan h-14 rounded-full text-[16px] font-bold disabled:opacity-40">{t("tests.check")}</button>}
      {levelUp && <LevelUp up={levelUp} onClose={() => setLevelUp(null)} />}
    </main>
  );
}

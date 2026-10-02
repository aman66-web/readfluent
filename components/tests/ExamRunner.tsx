"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BackLink } from "@/components/BackLink";
import { Mascot } from "@/components/mascot/Mascot";
import { LevelUp } from "@/components/xp/LevelUp";
import { useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { canSpeak, speak, stopSpeaking } from "@/lib/reading/speak";
import { subscribeTo, readRaw } from "@/lib/store/local";
import { saveExam } from "@/lib/tests/exam-store";
import type { Paper, Question } from "@/lib/tests/types";
import { EXAM, examPassed, passMark } from "@/lib/xp/exam";
import { levelUpBetween, type Cefr, type LevelUp as LevelUpInfo } from "@/lib/xp/levels";
import { LEDGER_KEY, currentXp, examDue, parseLedger, passExam } from "@/lib/xp/ledger";

const PROMPT: Record<Question["kind"], MessageId> = {
  vocab: "tests.prompt.vocab", gap: "tests.prompt.gap", meaning: "tests.prompt.meaning", order: "tests.prompt.order", listen: "tests.prompt.listen",
};
const subscribeLedger = subscribeTo(LEDGER_KEY);
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Speaker = () => <svg viewBox="0 0 24 24" className="size-7" {...stroke} aria-hidden><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>;
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** What a reader answered: the index picked, or for an `order` question the indexes of the words in the order tapped. */
type Given = number | number[] | null;
const isRight = (q: Question, g: Given): boolean =>
  q.kind === "order" ? Array.isArray(g) && g.map((i) => q.words![i]).join(" ") === q.solution!.join(" ") : typeof g === "number" && g === q.answer;

/**
 * A level exam (owner, 2 Oct 2026): forty mixed questions in thirty minutes, from the harder sentences, no hints and
 * no answers until the end, seventy-five in a hundred to pass (lib/xp/exam.ts). It opens only for a reader who has the
 * XP for the level; passing opens the level. The paper comes from /api/tests?exam=1 (no model: lib/tests/build.ts).
 */
export function ExamRunner({ level }: { level: Cefr }) {
  const t = useT();
  const a = useAnswers();
  const raw = useSyncExternalStore(subscribeLedger, () => readRaw(LEDGER_KEY), () => "");
  const due = useMemo(() => examDue(parseLedger(raw)), [raw]);
  const [round, setRound] = useState(0);
  // Once the exam is under way (or just passed) the ledger moves: the paper stays until the reader leaves it.
  const [started, setStarted] = useState(false);
  const back = (
    <BackLink fallback="/recall/tests" label={t("tests.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
    </BackLink>
  );
  if (!started && due !== level) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="sleepy" className="block h-[130px] w-auto" />
          <p className="mt-4 max-w-[19rem] text-[15.5px] leading-snug text-muted">{t("exam.locked", { level })}</p>
        </div>
      </main>
    );
  }
  return <Loader key={`${a.learn}:${level}:${round}`} lang={a.learn} level={level} back={back} onStart={() => setStarted(true)} onAgain={() => { setStarted(false); setRound((n) => n + 1); }} />;
}

function Loader({ lang, level, back, onStart, onAgain }: { lang: string | null; level: Cefr; back: React.ReactNode; onStart: () => void; onAgain: () => void }) {
  const t = useT();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!lang) return;
    let live = true;
    fetch(`/api/tests?lang=${lang}&level=${level}&exam=1&seed=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { paper: Paper }) => {
        if (!live) return;
        // A listening question needs a voice: without one it is left out, and an exam too short to be one is not given.
        const questions = d.paper.questions.filter((q) => q.kind !== "listen" || canSpeak());
        if (questions.length < EXAM.minQuestions) setFailed(true); else setPaper({ ...d.paper, questions });
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; stopSpeaking(); };
  }, [lang, level]);

  if (!lang || failed || !paper) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood={!lang || failed ? "sleepy" : "reading"} className="block h-[130px] w-auto" />
          <p className="mt-4 max-w-[17rem] text-[15.5px] leading-snug text-muted" aria-live="polite">{t(!lang ? "tests.pickLanguage" : failed ? "tests.error" : "tests.loading")}</p>
          {lang && failed && <button type="button" onClick={onAgain} className="btn-cyan mt-5 h-12 rounded-full px-7 text-[15px] font-bold">{t("tests.retry")}</button>}
        </div>
      </main>
    );
  }
  return <Exam paper={paper} level={level} lang={lang} back={back} onStart={onStart} onAgain={onAgain} />;
}

function Exam({ paper, level, lang, back, onStart, onAgain }: { paper: Paper; level: Cefr; lang: string; back: React.ReactNode; onStart: () => void; onAgain: () => void }) {
  const t = useT();
  const qs = paper.questions;
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [at, setAt] = useState(0);
  const [given, setGiven] = useState<Given[]>(() => qs.map(() => null));
  const [result, setResult] = useState<{ right: number; timeUp: boolean } | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);
  const finished = useRef(false);

  const givenRef = useRef(given);
  const finish = useCallback((answers: Given[], timeUp: boolean) => {
    if (finished.current) return;
    finished.current = true;
    stopSpeaking();
    const right = qs.reduce((n, q, i) => n + (isRight(q, answers[i]) ? 1 : 0), 0);
    saveExam(level, right, qs.length);
    if (examPassed(right, qs.length)) {
      const before = currentXp();
      passExam(level);
      const up = levelUpBetween(before, currentXp());
      if (up) setLevelUp(up);
    }
    setResult({ right, timeUp });
  }, [qs, level]);

  // The clock: one tick a second while the exam runs. Time is up: what has been answered is marked, and the rest is wrong.
  useEffect(() => {
    if (endsAt === null || result) return;
    const id = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endsAt) finish(givenRef.current, true);
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt, result, finish]);

  // A listening question says itself when it comes up.
  const q = qs[at];
  useEffect(() => {
    if (endsAt !== null && !result && q?.kind === "listen" && q.say) speak(q.say, lang, 0.95);
    return () => stopSpeaking();
  }, [q, lang, endsAt, result]);

  const start = () => { const n = Date.now(); setEndsAt(n + EXAM.minutes * 60_000); setNow(n); onStart(); };

  if (endsAt === null) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="ready" className="block h-[140px] w-auto" />
          <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{level}</p>
          <h1 className="title-display mt-1">{t("exam.title", { level })}</h1>
          <p className="mt-4 max-w-[20rem] text-[15.5px] leading-snug text-muted">{t("exam.rules", { questions: qs.length, minutes: EXAM.minutes, pass: Math.round(EXAM.passShare * 100) })}</p>
        </div>
        <button type="button" onClick={start} className="btn-cyan h-14 rounded-full text-[16px] font-bold">{t("exam.start")}</button>
      </main>
    );
  }

  if (result) {
    const passed = examPassed(result.right, qs.length);
    const missed = qs.filter((x, i) => !isRight(x, given[i]));
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col overflow-y-auto px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-col items-center py-6 text-center">
          <Mascot mood={passed ? "cheer" : "hello"} className="block h-[150px] w-auto" />
          <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{level}</p>
          <h1 className="tabular mt-1 text-[56px] font-extrabold leading-none tracking-[-0.03em]">{result.right}<span className="text-[28px] font-bold text-faint">/{qs.length}</span></h1>
          {result.timeUp && <p className="mt-2 text-[13.5px] font-semibold text-muted">{t("exam.timeUp")}</p>}
          <p className="mt-3 max-w-[20rem] text-[19px] font-bold leading-snug">{passed ? t("exam.passed", { level }) : t("exam.failed", { pass: Math.round(EXAM.passShare * 100), need: passMark(qs.length) })}</p>
        </div>
        {missed.length > 0 && (
          <section aria-label={t("exam.missed")}>
            <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ob-deep)]">{t("exam.missed")}</h2>
            <ul className="mt-2 space-y-2">
              {missed.map((x) => (
                <li key={x.id} className="sheet-card rounded-2xl p-3 text-[14.5px] leading-snug">
                  <span lang={lang} dir="auto" className="font-semibold">{x.reveal?.text ?? x.prompt}</span>
                  {x.reveal?.en ? <span dir="auto" className="text-muted"> · {x.reveal.en}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="mt-6 shrink-0">
          {passed
            ? <BackLink fallback="/" className="btn-cyan flex h-14 items-center justify-center rounded-full text-[16px] font-bold">{t("tests.back")}</BackLink>
            : <button type="button" onClick={onAgain} className="btn-cyan h-14 w-full rounded-full text-[16px] font-bold">{t("exam.again")}</button>}
          {!passed && <BackLink fallback="/recall/tests" className="mt-1 flex h-12 items-center justify-center text-[15px] font-semibold text-[var(--ob-deep)]">{t("tests.back")}</BackLink>}
        </div>
        {levelUp && <LevelUp up={levelUp} onClose={() => setLevelUp(null)} />}
      </main>
    );
  }

  const g = given[at];
  const last = at + 1 >= qs.length;
  const set = (v: Given) => { const next = given.map((x, i) => (i === at ? v : x)); givenRef.current = next; setGiven(next); };
  const tapped = Array.isArray(g) ? g : [];
  const canNext = q.kind === "order" ? tapped.length === q.words!.length : typeof g === "number";
  const left = endsAt - now;
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.25rem] [--pt:.5rem]">
      <div className="flex items-center gap-3">
        <span className="size-11 shrink-0" aria-hidden />
        <div role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={at} aria-label={t("tests.question", { n: at + 1, total: qs.length })} className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ob-track)]">
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-300" style={{ width: `${(at / qs.length) * 100}%` }} />
        </div>
        <span className="tabular w-12 text-end text-[13px] font-semibold text-muted">{at + 1}/{qs.length}</span>
      </div>
      <p className={`tabular mt-2 text-center text-[15px] font-bold ${left < 5 * 60_000 ? "text-rose-600" : "text-[var(--ob-deep)]"}`} role="timer" aria-label={t("exam.timeLeft", { time: clock(left) })}>{clock(left)}</p>

      <div className="relative flex flex-1 flex-col justify-center py-4">
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
                <button key={n} type="button" onClick={() => set(tapped.filter((_, k) => k !== n))} className="opt-on opt h-11 rounded-xl px-3.5 text-[17px] font-semibold">{q.words![i]}</button>
              ))}
            </div>
            <div lang={lang} dir="auto" className="mt-4 flex flex-wrap gap-2">
              {q.words!.map((w, i) => (
                <button key={i} type="button" disabled={tapped.includes(i)} onClick={() => set([...tapped, i])} className="opt h-11 rounded-xl px-3.5 text-[17px] font-semibold disabled:opacity-30">{w}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-2.5" role="radiogroup">
            {q.options!.map((o, i) => (
              <button key={i} type="button" role="radio" aria-checked={g === i} onClick={() => set(i)}
                      lang={q.kind === "gap" ? lang : q.kind === "listen" && !q.reveal?.en ? lang : undefined} dir="auto"
                      className={`opt min-h-14 rounded-2xl px-4 py-3 text-start text-[16.5px] font-semibold leading-snug ${g === i ? "opt-on" : ""}`}>
                {o}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" disabled={!canNext} onClick={() => { stopSpeaking(); if (last) finish(given, false); else setAt(at + 1); }} className="btn-cyan h-14 rounded-full text-[16px] font-bold disabled:opacity-40">
        {t(last ? "exam.finish" : "tests.next")}
      </button>
    </main>
  );
}

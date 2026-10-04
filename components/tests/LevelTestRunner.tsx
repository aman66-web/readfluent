"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { Mascot } from "@/components/mascot/Mascot";
import { LevelUp } from "@/components/xp/LevelUp";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { useRoman } from "@/components/reader/useRoman";
import { Meaning } from "@/components/recall/Meaning";
import { canListen, checkConnection, checkQuiet, listenOnce, type Connection, type ListenFail } from "@/lib/reading/listen";
import { hasVoiceFor, speak, stopSpeaking } from "@/lib/reading/speak";
import { hasRoman, romanText, romaniserFor, type Romaniser } from "@/lib/romanise";
import { gradeDictation, gradeSpeech, gradeWriting, isLatinText, wordCount } from "@/lib/tests/level/grade";
import { saveLevelResult } from "@/lib/tests/level/store";
import { LEVEL_TEST, TESTS_PER_LEVEL, levelPassMark, stepPoints, type LevelTest, type Part, type Step } from "@/lib/tests/level/types";
import { levelUpBetween, type Cefr, type LevelUp as LevelUpInfo } from "@/lib/xp/levels";
import { awardTestAnswer, awardTestFinish, currentXp } from "@/lib/xp/ledger";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Speaker = () => <svg viewBox="0 0 24 24" className="size-7" {...stroke} aria-hidden><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>;
const Mic = () => <svg viewBox="0 0 24 24" className="size-9" {...stroke} aria-hidden><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
const ROMAN_GLYPH: Record<string, string> = { hi: "अ", bn: "অ", zh: "文", ur: "ا", ar: "ع" };
const PART_LABEL: Record<Part, MessageId> = {
  read: "levelTests.part.read", vocab: "levelTests.part.vocab", listen: "levelTests.part.listen", dictate: "levelTests.part.dictate", write: "levelTests.part.write", speak: "levelTests.part.speak",
};
const TRIES = 2;

const Back = ({ label }: { label: string }) => (
  <BackLink fallback="/recall/tests" label={label} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
  </BackLink>
);

/**
 * One level test (owner, 4 Oct 2026): a passage and four questions, three vocabulary questions, two to listen to, a sentence
 * to type from dictation, a short piece of writing and two sentences to say aloud. Each step is checked at once and the
 * answer shown; the score is in points (lib/tests/level/types.ts) and 70% passes. The test comes from /api/level-test.
 */
export function LevelTestRunner({ level, n }: { level: Cefr; n: number }) {
  const a = useAnswers();
  const [round, setRound] = useState(0);
  return <Loader key={`${a.learn}:${level}:${n}:${round}`} lang={a.learn} level={level} n={n} onAgain={() => setRound((r) => r + 1)} />;
}

function Loader({ lang, level, n, onAgain }: { lang: string | null; level: Cefr; n: number; onAgain: () => void }) {
  const t = useT();
  const [test, setTest] = useState<LevelTest | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!lang) return;
    let live = true;
    fetch(`/api/level-test?lang=${lang}&level=${level}&n=${n}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(async (d: { test: LevelTest }) => {
        // Without a voice for the language, the listening questions and the dictation cannot be played and are left out.
        const voice = d.test.steps.some((s) => s.part === "listen" || s.part === "dictate") ? await hasVoiceFor(lang) : true;
        if (!live) return;
        setTest({ ...d.test, steps: d.test.steps.filter((s) => voice || (s.part !== "listen" && s.part !== "dictate")) });
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; stopSpeaking(); };
  }, [lang, level, n]);

  if (!lang || failed || (test && test.steps.length < 6)) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div><Back label={t("tests.back")} /></div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="sleepy" className="block h-[130px] w-auto" />
          <p className="mt-4 max-w-[17rem] text-[15.5px] leading-snug text-muted">{t(lang ? "levelTests.error" : "tests.pickLanguage")}</p>
          {lang && <button type="button" onClick={onAgain} className="btn-cyan mt-5 h-12 rounded-full px-7 text-[15px] font-bold">{t("tests.retry")}</button>}
        </div>
      </main>
    );
  }
  if (!test) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.5rem] [--pt:.5rem]">
        <div><Back label={t("tests.back")} /></div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="reading" className="block h-[130px] w-auto" />
          <p className="mt-4 text-[15.5px] text-muted" aria-live="polite">{t("tests.loading")}</p>
        </div>
      </main>
    );
  }
  return <Run test={test} lang={lang} onAgain={onAgain} />;
}

type Phase = "intro" | "gate" | "step" | "done";
interface Done { points: number; part: Part; max: number }

function Run({ test, lang, onAgain }: { test: LevelTest; lang: string; onAgain: () => void }) {
  const t = useT();
  const locale = useLocale();
  const roman = useRoman(lang);
  const language = languageName(lang as Parameters<typeof languageName>[0], locale);
  const { level, n } = test;
  const [conv, setConv] = useState<Romaniser | null>(null);
  useEffect(() => {
    if (!hasRoman(lang)) return;
    let live = true;
    void romaniserFor(lang).then((c) => { if (live) setConv(() => c); });
    return () => { live = false; };
  }, [lang]);
  const show = useCallback((s: string) => (roman.convert ? romanText(s, roman.convert) : s), [roman.convert]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [speakOk, setSpeakOk] = useState<boolean | null>(null);
  const [at, setAt] = useState(0);
  const [done, setDone] = useState<Done[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);
  const [earned, setEarned] = useState(0);
  const [outcome, setOutcome] = useState<{ passed: boolean; earnedLevel: boolean; passedCount: number } | null>(null);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; stopSpeaking(); }; }, []);

  const steps = test.steps;
  const step = steps[at];
  const total = useMemo(() => steps.filter((s) => s.part !== "speak" || speakOk !== false).reduce((x, s) => x + stepPoints(s), 0), [steps, speakOk]);

  const pay = useCallback((points: number) => {
    let xp = 0;
    const before = currentXp();
    for (let i = 0; i < points; i++) xp += awardTestAnswer(level);
    if (xp > 0) { setEarned((e) => e + xp); const up = levelUpBetween(before, currentXp()); if (up) setLevelUp(up); }
  }, [level]);

  const finish = useCallback((all: Done[]) => {
    const points = all.reduce((x, d) => x + d.points, 0);
    const max = all.reduce((x, d) => x + d.max, 0);
    const before = currentXp();
    const bonus = awardTestFinish(level, points, max);
    if (bonus > 0) setEarned((e) => e + bonus);
    const up = levelUpBetween(before, currentXp());
    if (up) setLevelUp(up);
    const res = saveLevelResult(lang, level, n, points, max);
    setOutcome({ ...res, passedCount: 0 });
    setPhase("done");
  }, [lang, level, n]);

  // Moves on after a step: on to the next, through the speaking gate once, or to the end.
  const advance = useCallback((points: number) => {
    stopSpeaking();
    const all = [...done, { points, part: step.part, max: stepPoints(step) }];
    setDone(all);
    let next = at + 1;
    if (speakOk === false) while (next < steps.length && steps[next].part === "speak") next++;
    if (next >= steps.length) { finish(all); return; }
    setAt(next);
    if (steps[next].part === "speak" && speakOk === null) setPhase("gate");
  }, [done, step, at, speakOk, steps, finish]);

  const back = <Back label={t("tests.back")} />;

  if (phase === "intro") {
    const counts = (["read", "vocab", "listen", "dictate", "write", "speak"] as Part[]).map((p) => [p, steps.filter((s) => s.part === p).reduce((x, s) => x + stepPoints(s), 0)] as const).filter(([, c]) => c > 0);
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.25rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="ready" className="block h-[130px] w-auto" />
          <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{level} · {t("levelTests.test", { n })}</p>
          <h1 className="title-display mt-1">{language}</h1>
          <p className="mt-3 max-w-[19rem] text-[14.5px] leading-snug text-muted">{t("levelTests.intro.body", { pass: Math.round(LEVEL_TEST.passShare * 100) })}</p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2" dir="auto">
            {counts.map(([p, c]) => <li key={p} className="sheet-card tabular rounded-full px-3 py-1 text-[13px] font-semibold">{t(PART_LABEL[p])} · {c}</li>)}
          </ul>
        </div>
        <button type="button" onClick={() => setPhase("step")} className="btn-cyan h-14 rounded-full text-[16px] font-bold">{t("levelTests.start")}</button>
        {roman.available && <RomanButton lang={lang} roman={roman} className="mx-auto mt-2" />}
      </main>
    );
  }

  if (phase === "gate") {
    return <SpeakGate back={back} lang={lang} onReady={() => { setSpeakOk(true); setPhase("step"); }} onSkip={() => {
      setSpeakOk(false);
      const all = done;
      if (at >= steps.length) { finish(all); return; }
      // Everything left is speaking: the test ends here, scored on the rest.
      if (steps.slice(at).every((s) => s.part === "speak")) finish(all); else { setAt((i) => i + 1); setPhase("step"); }
    }} />;
  }

  if (phase === "done") {
    const points = done.reduce((x, d) => x + d.points, 0);
    const max = done.reduce((x, d) => x + d.max, 0);
    const passed = points >= levelPassMark(max);
    const parts = (["read", "vocab", "listen", "dictate", "write", "speak"] as Part[]).map((p) => [p, done.filter((d) => d.part === p).reduce((x, d) => x + d.points, 0), done.filter((d) => d.part === p).reduce((x, d) => x + d.max, 0)] as const).filter(([, , m]) => m > 0);
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.25rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood={passed ? "cheer" : "hello"} className="block h-[140px] w-auto" />
          <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{level} · {t("levelTests.test", { n })}</p>
          <h1 className="tabular mt-1 text-[52px] font-extrabold leading-none tracking-[-0.03em]">{points}<span className="text-[26px] font-bold text-faint">/{max}</span></h1>
          <p className="mt-3 max-w-[19rem] text-[18px] font-bold leading-snug">{outcome?.earnedLevel ? t("levelTests.result.earned", { level }) : passed ? t("levelTests.result.passed", { n }) : t("levelTests.result.notPassed", { pass: Math.round(LEVEL_TEST.passShare * 100) })}</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {parts.map(([p, got, m]) => <li key={p} className="sheet-card tabular rounded-full px-3 py-1 text-[13px] font-semibold">{t(PART_LABEL[p])} {got}/{m}</li>)}
          </ul>
          {speakOk === false && <p className="mt-3 max-w-[19rem] text-[13px] leading-snug text-muted">{t("levelTests.skippedSpeak")}</p>}
          <p className="tabular mt-4 inline-flex rounded-full bg-accent-bright px-4 py-1.5 text-[15px] font-bold text-on-cyan">{t("tests.xpEarned", { xp: earned })}</p>
        </div>
        {passed && n < TESTS_PER_LEVEL && <a href={`/recall/tests/${level}/${n + 1}`} className="btn-cyan flex h-14 items-center justify-center rounded-full text-[16px] font-bold">{t("levelTests.result.next")}</a>}
        <button type="button" onClick={onAgain} className={`${passed && n < TESTS_PER_LEVEL ? "mt-1 h-12 text-[15px] font-semibold text-[var(--ob-deep)]" : "btn-cyan h-14 rounded-full text-[16px] font-bold"}`}>{t("levelTests.result.again")}</button>
        <BackLink fallback="/recall/tests" className="mt-1 flex h-12 items-center justify-center text-[15px] font-semibold text-[var(--ob-deep)]">{t("tests.back")}</BackLink>
        {levelUp && <LevelUp up={levelUp} onClose={() => setLevelUp(null)} />}
      </main>
    );
  }

  const shown = steps.filter((s) => s.part !== "speak" || speakOk !== false);
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.25rem] [--pt:.5rem]">
      <div className="flex items-center gap-3">
        {back}
        <div role="progressbar" aria-valuemin={0} aria-valuemax={shown.length} aria-valuenow={Math.min(at, shown.length)} aria-label={t("tests.question", { n: Math.min(at + 1, shown.length), total: shown.length })} className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ob-track)]">
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-300" style={{ width: `${(Math.min(at, shown.length) / shown.length) * 100}%` }} />
        </div>
        {roman.available && <RomanButton lang={lang} roman={roman} />}
        <span className="tabular w-12 text-end text-[13px] font-semibold text-muted">{Math.min(at + 1, shown.length)}/{shown.length}</span>
      </div>
      <StepView key={at} step={step} lang={lang} language={language} level={level} conv={conv} show={show} total={total} pay={pay} onNext={advance} last={at + 1 >= steps.length} />
      {levelUp && <LevelUp up={levelUp} onClose={() => setLevelUp(null)} />}
    </main>
  );
}

function RomanButton({ lang, roman, className = "" }: { lang: string; roman: ReturnType<typeof useRoman>; className?: string }) {
  const t = useT();
  return (
    <button type="button" aria-pressed={roman.on} aria-label={t("reader.roman")} title={t("reader.roman")} dir="ltr" onClick={() => roman.toggle()}
            className={`grid h-11 min-w-11 shrink-0 place-items-center rounded-full px-1.5 text-[15px] font-bold leading-none ${roman.on ? "bg-accent-bright/25 text-foreground" : "text-muted active:bg-border/60"} ${className}`}>
      <span lang={lang} aria-hidden>{ROMAN_GLYPH[lang] ?? "A"}<span className="text-[12px]">→A</span></span>
    </button>
  );
}

/** Two checks before the speaking part: the connection, and a quiet room. */
function SpeakGate({ back, lang, onReady, onSkip }: { back: React.ReactNode; lang: string; onReady: () => void; onSkip: () => void }) {
  const t = useT();
  const [net, setNet] = useState<Connection | null>(null);
  const [room, setRoom] = useState<{ quiet: boolean } | null | undefined>(undefined);
  const [busy, setBusy] = useState(true);
  const hears = useMemo(() => canListen(), []);
  const run = useCallback(() => {
    setBusy(true); setNet(null); setRoom(undefined);
    void (async () => {
      const c = await checkConnection();
      setNet(c);
      setRoom(await checkQuiet());
      setBusy(false);
    })();
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the checks need the device, so they start once the screen is up
  useEffect(() => { if (hears) run(); }, [hears, run]);

  if (!hears) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.25rem] [--pt:.5rem]">
        <div>{back}</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="sleepy" className="block h-[130px] w-auto" />
          <h1 className="mt-4 text-[22px] font-bold tracking-[-0.01em]">{t("levelTests.gate.nomic.title")}</h1>
          <p className="mt-2 max-w-[19rem] text-[14.5px] leading-snug text-muted">{t("levelTests.gate.nomic.body")}</p>
        </div>
        <button type="button" onClick={onSkip} className="btn-cyan h-14 rounded-full text-[16px] font-bold">{t("levelTests.gate.skip")}</button>
      </main>
    );
  }
  const netOk = net === "good";
  const roomOk = room === undefined ? null : room === null ? true : room.quiet;
  const row = (ok: boolean | null, title: string, text: string) => (
    <li className="sheet-card flex items-start gap-3 rounded-[20px] p-3.5">
      <span aria-hidden className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white ${ok === null ? "bg-border" : ok ? "bg-emerald-500" : "bg-amber-500"}`}>{ok === null ? "…" : ok ? "✓" : "!"}</span>
      <span className="min-w-0"><span className="block text-[15px] font-bold">{title}</span><span className="block text-[13.5px] leading-snug text-muted">{text}</span></span>
    </li>
  );
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5 [--pb:1.25rem] [--pt:.5rem]">
      <div>{back}</div>
      <div className="flex flex-1 flex-col justify-center">
        <Mascot mood="ready" className="mx-auto block h-[110px] w-auto" />
        <h1 className="title-display mt-3 text-center">{t("levelTests.gate.title")}</h1>
        <p className="mx-auto mt-2 max-w-[20rem] text-center text-[14.5px] leading-snug text-muted">{t("levelTests.gate.body")}</p>
        <ul className="mt-5 grid gap-2.5" aria-live="polite">
          {row(net === null ? null : netOk, t("levelTests.gate.wifi"), net === null ? t("levelTests.gate.checking") : t(`levelTests.gate.wifi.${net}` as MessageId))}
          {row(roomOk, t("levelTests.gate.quiet"), room === undefined ? t("levelTests.gate.checking") : room === null ? t("levelTests.gate.quiet.unknown") : t(room.quiet ? "levelTests.gate.quiet.good" : "levelTests.gate.quiet.noisy"))}
        </ul>
        <p lang={lang} className="sr-only">{lang}</p>
      </div>
      <button type="button" onClick={onReady} disabled={busy} className="btn-cyan h-14 rounded-full text-[16px] font-bold">{t(netOk && roomOk !== false ? "levelTests.gate.go" : "levelTests.gate.goAnyway")}</button>
      <button type="button" onClick={run} disabled={busy} className="mt-1 h-12 text-[15px] font-semibold text-[var(--ob-deep)] disabled:opacity-50">{t("levelTests.gate.again")}</button>
      <button type="button" onClick={onSkip} className="h-11 text-[14px] font-semibold text-muted">{t("levelTests.gate.skip")}</button>
    </main>
  );
}

const PassageCard = ({ title, text, lang, show, open }: { title: string; text: string; lang: string; show: (s: string) => string; open: boolean }) => (
  <details open={open} className="sheet-card mt-3 rounded-[20px] px-4 py-3">
    <summary lang={lang} dir="auto" className="cursor-pointer text-[15px] font-bold">{show(title)}</summary>
    <p lang={lang} dir="auto" className="font-reading mt-2 text-[18px] leading-relaxed">{show(text)}</p>
  </details>
);

interface ViewProps {
  step: Step; lang: string; language: string; level: Cefr; conv: Romaniser | null; show: (s: string) => string;
  total: number; pay: (points: number) => void; onNext: (points: number) => void; last: boolean;
}

/** One step: answer it, Check, see what was right, Next. */
function StepView({ step, lang, language, conv, show, pay, onNext, last }: ViewProps) {
  const t = useT();
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const [points, setPoints] = useState(0);
  const [noVoice, setNoVoice] = useState(false);
  const [tries, setTries] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [fail, setFail] = useState<ListenFail | null>(null);
  const [listening, setListening] = useState(false);
  const [wrote, setWrote] = useState<{ long: boolean; onTopic: boolean } | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => () => { stop.current?.(); stopSpeaking(); }, []);
  useEffect(() => { if (checked) feedback.current?.scrollIntoView({ block: "nearest" }); }, [checked]);

  const say = useCallback((s: string, rate = 0.95) => { if (!speak(s, lang, rate)) setNoVoice(true); }, [lang]);
  // A listening question or dictation says itself when it comes up.
  useEffect(() => {
    const s = step.part === "listen" ? step.question.say : step.part === "dictate" ? step.say : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- whether the device could speak is only known by trying
    if (s && !speak(s, lang, 0.95)) setNoVoice(true);
  }, [step, lang]);

  const award = (pts: number) => { setPoints(pts); setChecked(true); if (pts > 0) pay(pts); };

  const check = () => {
    if (step.part === "read") award(picked === step.answer ? 1 : 0);
    else if (step.part === "vocab" || step.part === "listen") award(picked === step.question.answer ? 1 : 0);
    else if (step.part === "dictate") {
      const typedLatin = hasRoman(lang) && isLatinText(text);
      const expected = typedLatin && conv ? conv(step.say) : step.say;
      award(gradeDictation(expected, text, typedLatin) ? 1 : 0);
    } else if (step.part === "write") {
      const g = gradeWriting(text, step.min, step.keys, { roman: conv ?? undefined, prompt: step.prompt });
      setWrote({ long: g.long, onTopic: g.onTopic });
      award(g.points);
    }
  };

  const speakNow = () => {
    if (step.part !== "speak") return;
    if (listening) { stop.current?.(); return; }
    stopSpeaking();
    setFail(null); setHeard(null); setListening(true);
    stop.current = listenOnce(lang, (said, why) => {
      setListening(false);
      if (!said) { setFail(why ?? "silent"); return; }
      setHeard(said[0]);
      const ok = said.some((s) => gradeSpeech(step.text, s));
      const used = tries + 1;
      setTries(used);
      if (ok) award(1); else if (used >= TRIES) award(0);
    });
  };

  const lbl = <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{t(PART_LABEL[step.part])}</p>;
  const choice = (options: string[], answer: number, native: boolean, opt: (s: string) => React.ReactNode = (s) => s) => (
    <div className="mt-4 grid gap-2.5" role="radiogroup">
      {options.map((o, i) => {
        const on = picked === i;
        const good = checked && i === answer;
        const bad = checked && on && i !== answer;
        return (
          <button key={i} type="button" role="radio" aria-checked={on} aria-disabled={checked} onClick={() => { if (!checked) setPicked(i); }} lang={native ? lang : undefined} dir="auto"
                  className={`opt min-h-12 rounded-2xl px-4 py-2.5 text-start text-[15px] font-medium leading-snug ${on && !checked ? "opt-on" : ""} ${good ? "!bg-emerald-50 [&::after]:!shadow-[inset_0_0_0_2px_#10b981]" : ""} ${bad ? "!bg-rose-50 [&::after]:!shadow-[inset_0_0_0_2px_#f43f5e]" : ""}`}>
            {opt(o)}
          </button>
        );
      })}
    </div>
  );
  const verdict = (ok: boolean, extra?: React.ReactNode) => checked && (
    <div ref={feedback} role="status" className={`mt-4 scroll-mb-28 rounded-2xl p-3.5 text-[14.5px] leading-snug ${ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
      <p className="font-bold">{t(ok ? "tests.right" : "tests.wrong")}</p>
      {extra}
    </div>
  );
  const listenButton = (s: string) => (
    <div className="mt-4 flex items-center gap-3">
      <button type="button" onClick={() => say(s)} aria-label={t("reader.listenPage")} className="btn-cyan grid size-20 place-items-center rounded-full"><Speaker /></button>
      <button type="button" onClick={() => say(s, 0.6)} className="sheet-card h-11 rounded-full px-4 text-[14px] font-semibold">{t("levelTests.slowly")}</button>
    </div>
  );
  const noVoiceNote = (s: string) => noVoice && (
    <div className="mt-3 text-[14px] leading-snug text-muted"><p>{t("tests.noVoice")}</p><p lang={lang} dir="auto" className="mt-1 text-[17px] font-semibold text-foreground">{show(s)}</p></div>
  );

  let body: React.ReactNode = null;
  let canCheck = false;
  if (step.part === "read") {
    canCheck = picked !== null;
    body = (<>{lbl}<PassageCard title={step.passage.title} text={step.passage.text} lang={lang} show={show} open /><p lang="en" className="mt-4 text-[18px] font-semibold leading-snug">{step.q}</p>{choice(step.options, step.answer, false)}{verdict(points === 1)}</>);
  } else if (step.part === "vocab") {
    const q = step.question;
    canCheck = picked !== null;
    body = (<>{lbl}<p className="mt-1 text-[14px] text-muted">{t("tests.prompt.vocab")}</p><p lang={lang} dir="auto" className="font-reading mt-2 text-[32px] font-bold leading-snug tracking-[-0.015em]">{show(q.prompt)}</p>{choice(q.options!, q.answer!, false, (s) => <Meaning text={s} />)}{verdict(points === 1)}</>);
  } else if (step.part === "listen") {
    const q = step.question;
    canCheck = picked !== null;
    body = (<>{lbl}<p className="mt-1 text-[14px] text-muted">{t("tests.prompt.listen")}</p>{listenButton(q.say!)}{noVoiceNote(q.say!)}{choice(q.options!, q.answer!, true, show)}{verdict(points === 1)}</>);
  } else if (step.part === "dictate") {
    canCheck = text.trim().length > 0;
    body = (<>{lbl}<p className="mt-1 text-[14px] text-muted">{t("levelTests.dictate.prompt")}</p>{listenButton(step.say)}{noVoiceNote(step.say)}
      <Typing lang={lang} language={language} value={text} onChange={setText} disabled={checked} rows={2} />
      {verdict(points === 1, <p className="mt-1"><bdi lang={lang} className="font-semibold">{show(step.say)}</bdi></p>)}</>);
  } else if (step.part === "write") {
    const words = wordCount(text);
    canCheck = text.trim().length > 0;
    body = (<>{lbl}<PassageCard title={step.passage.title} text={step.passage.text} lang={lang} show={show} open={false} /><p lang="en" className="mt-4 text-[18px] font-semibold leading-snug">{step.prompt}</p><p className="mt-1 text-[13px] leading-snug text-muted">{t("levelTests.write.hint", { language })}</p>
      <Typing lang={lang} language={language} value={text} onChange={setText} disabled={checked} rows={4} />
      <p className="tabular mt-1 text-end text-[12.5px] text-muted">{t("levelTests.write.words", { n: words, min: step.min })}</p>
      {checked && wrote && verdict(points === 2, <ul className="mt-1 space-y-0.5"><li>{wrote.long ? "✓" : "✗"} {t(wrote.long ? "levelTests.write.long" : "levelTests.write.short", { min: step.min })}</li><li>{wrote.onTopic ? "✓" : "✗"} {t(wrote.onTopic ? "levelTests.write.topic" : "levelTests.write.offTopic")}</li><li className="pt-1 text-[13px] opacity-80">{t("levelTests.write.note")}</li></ul>)}</>);
  } else {
    const left = TRIES - tries;
    body = (<>{lbl}<p className="mt-1 text-[14px] text-muted">{t("levelTests.speak.title")}</p>
      <p lang={lang} dir="auto" className="font-reading mt-3 text-[24px] font-bold leading-snug tracking-[-0.01em]">{show(step.text)}</p>
      {listenButton(step.text)}{noVoiceNote(step.text)}
      <div className="mt-5 flex flex-col items-center">
        <button type="button" onClick={speakNow} disabled={checked} aria-pressed={listening} aria-label={t(listening ? "levelTests.speak.listening" : "levelTests.speak.tap")}
                className={`grid size-24 place-items-center rounded-full ${listening ? "bg-rose-500 text-white" : "btn-cyan"} disabled:opacity-40`}><Mic /></button>
        <p className="mt-2 text-[14px] text-muted" aria-live="polite">{listening ? t("levelTests.speak.listening") : checked ? "" : t("levelTests.speak.tap")}</p>
        {!checked && tries > 0 && <p className="tabular text-[12.5px] text-muted">{t("levelTests.speak.left", { n: left })}</p>}
      </div>
      {fail && <p role="status" className="mt-2 text-center text-[14px] leading-snug text-rose-700">{t(fail === "denied" ? "levelTests.speak.denied" : fail === "network" ? "levelTests.speak.network" : "levelTests.speak.nothing")}</p>}
      {heard && <p role="status" className="mt-3 text-center text-[14px] leading-snug text-muted">{t("levelTests.speak.heard")} <bdi lang={lang} className="font-semibold text-foreground">{show(heard)}</bdi></p>}
      {verdict(points === 1)}</>);
    canCheck = false;
  }

  const isSpeak = step.part === "speak";
  return (
    <>
      <div className="relative flex-1 pb-4">{body}</div>
      <div className="sticky bottom-0 -mx-5 flex flex-col bg-background/95 px-5 pt-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        {checked
          ? <button type="button" onClick={() => onNext(points)} className="btn-cyan h-14 rounded-full text-[16px] font-bold">{t(last ? "tests.finish" : "tests.next")}</button>
          : isSpeak
            ? <button type="button" onClick={() => { stop.current?.(); award(0); }} className="h-14 text-[15px] font-semibold text-muted">{t("levelTests.speak.skip")}</button>
            : <button type="button" onClick={check} disabled={!canCheck} className="btn-cyan h-14 rounded-full text-[16px] font-bold disabled:opacity-40">{t("tests.check")}</button>}
      </div>
    </>
  );
}

function Typing({ lang, language, value, onChange, disabled, rows }: { lang: string; language: string; value: string; onChange: (v: string) => void; disabled: boolean; rows: number }) {
  const t = useT();
  return (
    <div className="mt-4">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={rows} lang={lang} dir="auto" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                aria-label={t("levelTests.write.placeholder")} placeholder={t("levelTests.write.placeholder")}
                className="sheet-card block w-full resize-none rounded-2xl p-3.5 text-[18px] leading-snug outline-none focus:shadow-[inset_0_0_0_2px_var(--ob-teal)] disabled:opacity-70" />
      <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{t(hasRoman(lang) ? "levelTests.keyboard.roman" : "levelTests.keyboard", { language })}</p>
    </div>
  );
}

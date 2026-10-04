"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BackLink } from "@/components/BackLink";
import { Mascot } from "@/components/mascot/Mascot";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { hasVoiceFor } from "@/lib/reading/speak";
import { readRaw } from "@/lib/store/local";
import { supportFor } from "@/lib/tests/support";
import { TESTS_KEY, parseResults, resultKey, subscribeTests } from "@/lib/tests/store";
import type { TestKind } from "@/lib/tests/types";
import { LEVEL_TESTS_KEY, levelResultKey, parseLevelResults, passedCount, subscribeLevelTests } from "@/lib/tests/level/store";
import { TESTS_PER_LEVEL } from "@/lib/tests/level/types";
import { CEFR, XP, levelFromXp, xpForTestAnswer, xpForTestFinish, type Cefr } from "@/lib/xp/levels";
import { PAPER_SIZE } from "@/lib/tests/types";
import { LEDGER_KEY, examDue, parseLedger, totalXp } from "@/lib/xp/ledger";
import { subscribeTo } from "@/lib/store/local";

const subLedger = subscribeTo(LEDGER_KEY);
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A paper's picture, tile colour and ink. */
const LOOK: Record<TestKind, { icon: React.ReactNode; tile: string }> = {
  mixed: { icon: <><path d="M9 11l2.5 2.5L16 9" /><rect x="4" y="4" width="16" height="16" rx="3.5" /></>, tile: "from-[#22D3EE] to-[#0EB5D3] text-on-cyan" },
  vocab: { icon: <path d="M4 5h6a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H4zM20 5h-4a3 3 0 0 0-3 3" />, tile: "from-[#DDD6FE] to-[#C4B5FD] text-on-cyan" },
  gap: { icon: <path d="M4 12h5M15 12h5M10 8v8M14 8v8" />, tile: "from-[#BAE6FD] to-[#7DD3FC] text-on-cyan" },
  meaning: { icon: <path d="M4 6h16M4 11h16M4 16h10" />, tile: "from-[#0E7490] to-[#0A566E] text-white" },
  order: { icon: <path d="M7 5v14M7 19l-3-3M7 19l3-3M17 19V5M17 5l-3 3M17 5l3 3" />, tile: "from-[#A5F3FC] to-[#67E8F9] text-on-cyan" },
  listen: { icon: <path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />, tile: "from-[#C7D2FE] to-[#A5B4FC] text-on-cyan" },
};

/**
 * The tests: pick a level (A1 to C2; the reader's own is chosen) and a kind of test, and take it. Every right answer
 * earns XP, more than reading or flashcards do. What each language has is in lib/tests/support.ts.
 */
export function TestsHub() {
  const t = useT();
  const locale = useLocale();
  const a = useAnswers();
  const lang = a.learn;
  const support = supportFor(lang);
  const ledgerRaw = useSyncExternalStore(subLedger, () => readRaw(LEDGER_KEY), () => "");
  const mine = useMemo(() => levelFromXp(totalXp(parseLedger(ledgerRaw))), [ledgerRaw]);
  const due = useMemo(() => examDue(parseLedger(ledgerRaw)), [ledgerRaw]);
  const [picked, setPicked] = useState<Cefr | null>(null);
  const resultsRaw = useSyncExternalStore(subscribeTests, () => readRaw(TESTS_KEY), () => "");
  const results = useMemo(() => parseResults(resultsRaw), [resultsRaw]);
  const levelRaw = useSyncExternalStore(subscribeLevelTests, () => readRaw(LEVEL_TESTS_KEY), () => "");
  const levelResults = useMemo(() => parseLevelResults(levelRaw), [levelRaw]);
  // Which levels the language has level tests for (all of them once its reading passages are in); until it is known, all.
  const [ready, setReady] = useState<{ lang: string; levels: Cefr[] } | null>(null);
  useEffect(() => {
    if (!lang) return;
    let live = true;
    fetch(`/api/level-test?lang=${lang}`).then((r) => (r.ok ? r.json() : null)).then((d: { levels?: Cefr[] } | null) => { if (live && d?.levels) setReady({ lang, levels: d.levels }); }).catch(() => {});
    return () => { live = false; };
  }, [lang]);
  const level = picked ?? due ?? mine.level;
  const hasLevelTests = !ready || ready.lang !== lang || ready.levels.includes(level);
  const language = lang ? languageName(lang, locale) : "";
  // A listening test needs a voice for the language on this device; without one its tile is not offered.
  const [voice, setVoice] = useState<{ lang: string | null; ok: boolean }>({ lang: null, ok: true });
  useEffect(() => {
    if (!lang) return;
    let live = true;
    void hasVoiceFor(lang).then((ok) => { if (live) setVoice({ lang, ok }); });
    return () => { live = false; };
  }, [lang]);
  const noVoice = voice.lang === lang && !voice.ok;
  const kinds = (support?.kinds ?? []).filter((k) => k !== "listen" || !noVoice);
  // What a full pass pays at this level: less when the test is below the reader's own level.
  const maxXp = xpForTestAnswer(level, mine.level) * PAPER_SIZE + xpForTestFinish(level, mine.level, PAPER_SIZE, PAPER_SIZE);

  return (
    <main className="safe-top px-5 pb-32 [--pt:.5rem]">
      <BackLink fallback="/recall" label={t("ui.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </BackLink>
      <header className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="title-display">{t("tests.title")}</h1>
          <p className="mt-1.5 max-w-[16.5rem] text-[14.5px] leading-snug text-muted">{t("tests.sub")}</p>
        </div>
        <span className="-mt-1 block w-[74px] shrink-0"><Mascot mood="ready" className="w-full" /></span>
      </header>

      {!lang ? (
        <Link href="/languages" className="sheet-card mt-5 flex min-h-14 items-center rounded-[22px] px-4 text-[14.5px] text-muted">{t("tests.pickLanguage")}</Link>
      ) : (
        <>
          {/* The XP for the next level is in hand and its exam is the way up. */}
          {due && (
            <button type="button" onClick={() => setPicked(due)} data-exam={due} className="mt-5 block w-full rounded-[24px] bg-gradient-to-br from-[#0E7490] to-[#0A4B62] p-4 text-start text-white shadow-[0_16px_26px_-20px_rgba(8,47,60,.7)] active:scale-[0.98]">
              <span className="block text-[17px] font-bold leading-snug">{t("levelTests.banner.title", { level: due })}</span>
              <span className="mt-1 block text-[13px] leading-snug text-white/85">{t("levelTests.banner.body", { level: due })}</span>
              <span className="btn-cyan mt-3 flex h-11 items-center justify-center rounded-full text-[15px] font-bold">{t("levelTests.banner.button", { level: due })}</span>
            </button>
          )}
          <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ob-deep)]">{t("tests.level")}</p>
          <div className="mt-2 grid grid-cols-6 gap-1.5" role="group" aria-label={t("tests.level")} dir="ltr">
            {CEFR.map((l) => {
              const on = level === l;
              const ok = true;
              return (
                <button key={l} type="button" disabled={!ok} aria-pressed={on} onClick={() => setPicked(l)}
                        className={`opt flex h-12 flex-col items-center justify-center rounded-xl text-[15px] font-extrabold ${on ? "opt-on" : ""}`}>
                  {l}
                  {l === mine.level ? <span className="mt-0.5 block size-1.5 rounded-full bg-[var(--ob-teal)]" aria-label={t("tests.yours")} /> : null}
                </button>
              );
            })}
          </div>

          <section className="mt-6" aria-label={t("levelTests.title")}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[19px] font-bold tracking-[-0.01em]">{t("levelTests.title")} · {level}</h2>
              <span className="tabular shrink-0 rounded-full bg-accent-bright/25 px-2.5 py-0.5 text-[12.5px] font-bold" data-progress={passedCount(levelResults, lang, level)}>
                {passedCount(levelResults, lang, level) === TESTS_PER_LEVEL ? `✓ ${t("levelTests.earned", { level })}` : t("levelTests.progress", { n: passedCount(levelResults, lang, level) })}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] leading-snug text-muted">{t("levelTests.sub")} {t("levelTests.open")}</p>
            {hasLevelTests ? (
              <ul className="mt-3 grid grid-cols-5 gap-2" dir="ltr">
                {Array.from({ length: TESTS_PER_LEVEL }, (_, i) => i + 1).map((n) => {
                  const r = levelResults[levelResultKey(lang, level, n)];
                  return (
                    <li key={n}>
                      <Link href={`/recall/tests/${level}/${n}`} data-level-test={n} aria-label={`${t("levelTests.test", { n })}${r ? `, ${r.points}/${r.total}` : ""}`}
                            className={`opt flex h-16 flex-col items-center justify-center rounded-2xl text-[18px] font-extrabold ${r?.passed ? "opt-on" : ""}`}>
                        {n}
                        <span className="tabular mt-0.5 text-[10.5px] font-bold text-muted">{r ? `${r.passed ? "✓ " : ""}${r.points}/${r.total}` : "·"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="sheet-card mt-3 rounded-[22px] p-4 text-[14.5px] leading-snug text-muted">{t("levelTests.soon", { level, language })}</p>
            )}
          </section>

          {support && support.levels.includes(level) && kinds.length > 0 && (
            <>
              <h2 className="mt-8 text-[17px] font-bold tracking-[-0.01em]">{t("levelTests.practice")}</h2>
              <p className="mt-0.5 text-[13.5px] leading-snug text-muted">{t("levelTests.practiceSub")}</p>
              <ul className="mt-5 grid grid-cols-2 gap-3">
                {kinds.map((k, i) => {
                  const r = results[resultKey(lang, level, k)];
                  const wide = i === 0;
                  return (
                    <li key={k} className={wide ? "col-span-2" : ""}>
                      <Link href={`/recall/tests/${level}/${k}`} data-test={k}
                            className={`relative flex h-full overflow-hidden rounded-[26px] bg-gradient-to-br p-4 shadow-[0_16px_26px_-20px_rgba(8,47,60,.7)] active:scale-[0.98] ${LOOK[k].tile} ${wide ? "min-h-[7.5rem] items-end" : "min-h-[10.5rem] flex-col justify-between"}`}>
                        <span aria-hidden className="pointer-events-none absolute -end-5 -top-5 size-24 rounded-full bg-white/15" />
                        <svg viewBox="0 0 24 24" className={`shrink-0 ${wide ? "absolute end-5 top-5 size-12" : "relative size-9"}`} {...stroke} strokeWidth={1.7} aria-hidden>{LOOK[k].icon}</svg>
                        <span className="relative block">
                          <span className="block text-[18px] font-bold leading-tight tracking-[-0.01em]">{t(`tests.kind.${k}` as MessageId)}</span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug opacity-80">{t(`tests.kind.${k}.sub` as MessageId)}</span>
                          <span className="tabular mt-2 inline-flex rounded-full bg-white/30 px-2.5 py-0.5 text-[11.5px] font-bold">
                            {r ? t("tests.best", { n: r.best, total: r.total }) : t("tests.upTo", { xp: maxXp })}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 text-[13px] leading-snug text-muted">{t("tests.howXp", { xp: XP.test.correct, pass: Math.round(XP.test.passShare * 100) })}</p>
            </>
          )}
        </>
      )}
    </main>
  );
}

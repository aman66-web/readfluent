"use client";

import { useEffect, useMemo, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { CHECK_COUNTS, miniQuestions, pageItems, type QuizPage } from "@/lib/quiz/mini";
import { savePrefs, type CheckPref } from "@/lib/reading/prefs";
import type { Question } from "@/lib/tests/types";
import { levelUpBetween, type Cefr, type LevelUp as LevelUpInfo } from "@/lib/xp/levels";
import { awardTestAnswer, currentXp } from "@/lib/xp/ledger";

const PROMPT: Partial<Record<Question["kind"], MessageId>> = { vocab: "tests.prompt.vocab", gap: "tests.prompt.gap", meaning: "tests.prompt.meaning" };
const WELL: MessageId[] = ["cheer.2", "cheer.3", "cheer.4"];

/**
 * The quick check offered after every five pages (owner, 4 Oct 2026). It is only ever an offer: the reader says how many questions they
 * want (3, 5 or 10, remembered), or "Not now", or "Stop asking", and the book is right there behind it. The questions come from
 * the five pages just read (lib/quiz/mini.ts); each right answer earns a little XP, like the tests.
 */
export function MiniCheck({ asked, pool, lang, level, seed, pref, show, onLevelUp, onClose }: {
  asked: QuizPage[]; pool: QuizPage[]; lang: string; level: Cefr; seed: number; pref: CheckPref; show: (s: string) => string;
  onLevelUp: (up: LevelUpInfo) => void; onClose: () => void;
}) {
  const t = useT();
  const [stage, setStage] = useState<"ask" | "run" | "done">("ask");
  const [choosing, setChoosing] = useState(pref === null);
  const [qs, setQs] = useState<Question[]>([]);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [earned, setEarned] = useState(0);
  const [stopped, setStopped] = useState(false);
  const items = useMemo(() => ({ asked: pageItems(asked), pool: pageItems(pool) }), [asked, pool]);

  // Escape closes it like "Not now".
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const start = (n: number) => {
    const made = miniQuestions({ lang, asked: items.asked, pool: items.pool, count: n, seed });
    setQs(made); setAt(0); setPicked(null); setRight(0); setEarned(0);
    setStage(made.length ? "run" : "done");
  };
  const pickCount = (n: (typeof CHECK_COUNTS)[number]) => { savePrefs({ check: n }); start(n); };

  const q = qs[at];
  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    if (i === q.answer) {
      setRight((r) => r + 1);
      const before = currentXp();
      const xp = awardTestAnswer(level);
      if (xp > 0) { setEarned((e) => e + xp); const up = levelUpBetween(before, currentXp()); if (up) onLevelUp(up); }
    }
  };
  const next = () => { if (at + 1 >= qs.length) setStage("done"); else { setAt(at + 1); setPicked(null); } };

  const shell = "fade-in absolute inset-x-0 bottom-0 z-20 max-h-[88%] overflow-y-auto rounded-t-[26px] border-t border-border bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-10px_36px_rgba(0,0,0,.16)]";

  if (stage === "ask") {
    return (
      <section role="dialog" aria-label={t("miniCheck.title")} className={shell} data-minicheck="ask">
        <div className="flex items-center gap-3">
          <Mascot mood="cheer" className="w-[64px] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-[19px] font-bold leading-tight tracking-[-0.01em]">{t("miniCheck.title")}</h2>
            <p className="mt-0.5 text-[13.5px] leading-snug text-muted">{stopped ? t("miniCheck.offDone") : t("miniCheck.body", { n: asked.length })}</p>
          </div>
        </div>
        {!stopped && (choosing || pref === null || pref === 0 ? (
          <div className="mt-4">
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ob-deep)]">{t("miniCheck.ask")}</p>
            <div className="mt-2 grid grid-cols-3 gap-2" dir="ltr">
              {CHECK_COUNTS.map((n) => (
                <button key={n} type="button" onClick={() => pickCount(n)} className="opt h-14 rounded-2xl text-[20px] font-extrabold">{n}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => start(pref)} className="btn-cyan mt-4 h-13 w-full rounded-full px-5 py-3.5 text-[16px] font-bold">{t("miniCheck.start", { n: pref })}</button>
            <button type="button" onClick={() => setChoosing(true)} className="mt-1 h-10 w-full text-[14px] font-semibold text-[var(--ob-deep)]">{t("miniCheck.change")}</button>
          </>
        ))}
        <div className="mt-1 flex items-center justify-between gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-full px-3 text-[15px] font-semibold text-muted">{stopped ? t("miniCheck.keepReading") : t("miniCheck.skip")}</button>
          {!stopped && <button type="button" onClick={() => { savePrefs({ check: 0 }); setStopped(true); }} className="h-11 rounded-full px-3 text-[13px] font-semibold text-faint">{t("miniCheck.off")}</button>}
        </div>
      </section>
    );
  }

  if (stage === "done") {
    const share = qs.length ? right / qs.length : 0;
    return (
      <section role="dialog" aria-label={t("miniCheck.title")} className={`${shell} text-center`} data-minicheck="done">
        <Mascot mood="cheer" className="mx-auto block h-[110px] w-auto" />
        {qs.length ? (
          <>
            <p className="mt-2 text-[20px] font-bold">{t(share === 1 ? "cheer.6" : share >= 0.6 ? WELL[right % WELL.length] : "cheer.5")}</p>
            <p className="tabular mt-1 text-[15px] text-muted">{t("miniCheck.result", { right, total: qs.length })}</p>
            {earned > 0 && <p className="tabular mt-2 inline-flex rounded-full bg-accent-bright px-3.5 py-1 text-[14px] font-bold text-on-cyan">{t("reader.xp", { xp: earned })}</p>}
          </>
        ) : <p className="mt-2 text-[15px] leading-snug text-muted">{t("miniCheck.none")}</p>}
        <button type="button" onClick={onClose} className="btn-cyan mt-4 h-13 w-full rounded-full px-5 py-3.5 text-[16px] font-bold">{t("miniCheck.keepReading")}</button>
      </section>
    );
  }

  return (
    <section role="dialog" aria-label={t("miniCheck.title")} className={shell} data-minicheck="run">
      <div className="flex items-center gap-3">
        <div role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={at} className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--ob-track)]">
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-300" style={{ width: `${((at + (picked !== null ? 1 : 0)) / qs.length) * 100}%` }} />
        </div>
        <span className="tabular text-[13px] font-semibold text-muted">{at + 1}/{qs.length}</span>
        <button type="button" onClick={onClose} aria-label={t("miniCheck.skip")} className="grid size-9 place-items-center rounded-full text-muted active:bg-border/60">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{t(PROMPT[q.kind] ?? "tests.prompt.meaning")}</p>
      <p lang={lang} dir="auto" className={`font-reading mt-1.5 font-bold leading-snug ${q.kind === "vocab" ? "text-[28px]" : "text-[20px]"}`}>{show(q.prompt)}</p>
      <div className="mt-3 grid gap-2" role="radiogroup">
        {q.options!.map((o, i) => {
          const good = picked !== null && i === q.answer;
          const bad = picked === i && i !== q.answer;
          return (
            <button key={i} type="button" role="radio" aria-checked={picked === i} aria-disabled={picked !== null} onClick={() => answer(i)}
                    lang={q.kind === "gap" ? lang : undefined} dir="auto"
                    className={`opt min-h-11 rounded-2xl px-4 py-2 text-start text-[15px] font-medium leading-snug ${good ? "!bg-emerald-50 [&::after]:!shadow-[inset_0_0_0_2px_#10b981]" : ""} ${bad ? "!bg-rose-50 [&::after]:!shadow-[inset_0_0_0_2px_#f43f5e]" : ""}`}>
              {q.kind === "gap" ? show(o) : o}
            </button>
          );
        })}
      </div>
      {picked !== null && <button type="button" onClick={next} className="btn-cyan mt-3 h-12 w-full rounded-full text-[15.5px] font-bold">{t(at + 1 >= qs.length ? "tests.finish" : "tests.next")}</button>}
    </section>
  );
}

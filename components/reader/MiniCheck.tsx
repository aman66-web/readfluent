"use client";

import { useEffect, useMemo, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { QUIZ_QUESTIONS, miniQuestions, pageItems, type QuizPage } from "@/lib/quiz/mini";
import type { Question } from "@/lib/tests/types";
import { levelUpBetween, type Cefr, type LevelUp as LevelUpInfo } from "@/lib/xp/levels";
import { awardTestAnswer, currentXp } from "@/lib/xp/ledger";

const PROMPT: Partial<Record<Question["kind"], MessageId>> = { vocab: "tests.prompt.vocab", gap: "tests.prompt.gap", meaning: "tests.prompt.meaning" };
const WELL: MessageId[] = ["cheer.2", "cheer.3", "cheer.4"];

/**
 * The quiz that comes up by itself after every five pages (owner, 5 Oct 2026, replacing the "Quick check?" box with its choices: that was
 * too confusing): a screen of its own with a few questions, mostly the words of the five pages just read (lib/quiz/mini.ts), and a Skip
 * button at the top the whole way through. Each right answer earns a little XP, like the tests. Nothing to choose, nothing to turn off here
 * (the reading settings have one switch).
 */
export function MiniCheck({ asked, pool, lang, level, seed, show, onLevelUp, onClose }: {
  asked: QuizPage[]; pool: QuizPage[]; lang: string; level: Cefr; seed: number; show: (s: string) => string;
  onLevelUp: (up: LevelUpInfo) => void; onClose: () => void;
}) {
  const t = useT();
  const qs = useMemo<Question[]>(() => miniQuestions({ lang, asked: pageItems(asked), pool: pageItems(pool), count: QUIZ_QUESTIONS, seed }), [asked, pool, lang, seed]);
  const [stage, setStage] = useState<"run" | "done">("run");
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [earned, setEarned] = useState(0);

  // Pages that cannot make a question (nothing matched yet): no quiz, and no empty screen either.
  useEffect(() => { if (qs.length === 0) onClose(); }, [qs.length, onClose]);

  // Escape skips, like the button.
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

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

  const shell = "fade-in absolute inset-0 z-30 flex flex-col overflow-y-auto bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]";
  if (qs.length === 0) return null;

  if (stage === "done") {
    const share = right / qs.length;
    return (
      <section role="dialog" aria-label={t("miniCheck.title")} className={`${shell} items-center justify-center text-center`} data-minicheck="done">
        <Mascot mood="cheer" className="mx-auto block h-[150px] w-auto" />
        <p className="mt-3 text-[24px] font-bold">{t(share === 1 ? "cheer.6" : share >= 0.6 ? WELL[right % WELL.length] : "cheer.5")}</p>
        <p className="tabular mt-1 text-[16px] text-muted">{t("miniCheck.result", { right, total: qs.length })}</p>
        {earned > 0 && <p className="tabular mt-3 inline-flex rounded-full bg-accent-bright px-3.5 py-1 text-[14px] font-bold text-on-cyan">{t("reader.xp", { xp: earned })}</p>}
        <button type="button" onClick={onClose} className="btn-cyan mt-6 h-14 w-full max-w-sm rounded-full px-5 text-[16.5px] font-bold">{t("miniCheck.keepReading")}</button>
      </section>
    );
  }

  return (
    <section role="dialog" aria-label={t("miniCheck.title")} className={shell} data-minicheck="run">
      <div className="flex items-center gap-3">
        <Mascot mood="cheer" className="w-[48px] shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold leading-tight">{t("miniCheck.title")}</h2>
          <p className="text-[12.5px] leading-snug text-muted">{t("miniCheck.body", { n: asked.length })}</p>
        </div>
        <button type="button" onClick={onClose} data-skip className="h-11 shrink-0 rounded-full px-4 text-[15px] font-bold text-[var(--ob-deep)] active:bg-border/60">{t("miniCheck.skip")}</button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={at} className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--ob-track)]">
          <div className="h-full rounded-full bg-accent-bright transition-[width] duration-300" style={{ width: `${((at + (picked !== null ? 1 : 0)) / qs.length) * 100}%` }} />
        </div>
        <span className="tabular text-[13px] font-semibold text-muted">{at + 1}/{qs.length}</span>
      </div>
      <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ob-deep)]">{t(PROMPT[q.kind] ?? "tests.prompt.meaning")}</p>
      <p lang={lang} dir="auto" className={`font-reading mt-2 font-bold leading-snug ${q.kind === "vocab" ? "text-[34px]" : "text-[22px]"}`}>{show(q.prompt)}</p>
      <div className="mt-5 grid gap-2.5" role="radiogroup">
        {q.options!.map((o, i) => {
          const good = picked !== null && i === q.answer;
          const bad = picked === i && i !== q.answer;
          return (
            <button key={i} type="button" role="radio" aria-checked={picked === i} aria-disabled={picked !== null} onClick={() => answer(i)}
                    lang={q.kind === "gap" ? lang : undefined} dir="auto"
                    className={`opt min-h-[3.25rem] rounded-2xl px-4 py-2.5 text-start text-[16.5px] font-medium leading-snug ${good ? "!bg-emerald-50 [&::after]:!shadow-[inset_0_0_0_2px_#10b981]" : ""} ${bad ? "!bg-rose-50 [&::after]:!shadow-[inset_0_0_0_2px_#f43f5e]" : ""}`}>
              {q.kind === "gap" ? show(o) : o}
            </button>
          );
        })}
      </div>
      {picked !== null && <button type="button" onClick={next} className="btn-cyan mt-4 h-14 w-full rounded-full text-[16.5px] font-bold">{t(at + 1 >= qs.length ? "tests.finish" : "tests.next")}</button>}
    </section>
  );
}

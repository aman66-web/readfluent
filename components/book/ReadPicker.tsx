"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { LENGTHS, LEVELS, levelById, levelForCefr, type Length, type LevelId } from "@/lib/content/limits";
import { useT } from "@/lib/i18n/react";
import { ANSWERS_KEY, parseAnswers } from "@/lib/onboarding/answers";
import { CHOICE_KEY, parseChoice, saveChoice } from "@/lib/progress";
import { readRaw, subscribeTo } from "@/lib/store/local";

const subscribeChoice = subscribeTo(CHOICE_KEY);
const readChoiceRaw = () => readRaw(CHOICE_KEY);
const subscribeAnswers = subscribeTo(ANSWERS_KEY);
const readAnswersRaw = () => readRaw(ANSWERS_KEY);
// On the server there is no device storage: "" is what the first client render shows too.
const serverRaw = () => "";

/**
 * The level and the length of a book, chosen on the book's own page: both are already picked (the level the
 * reader said they were at when they signed up, or what they last chose for this book; the shortest
 * length), and a tap on another one changes it. The Read button goes straight to the first page.
 * Renders the two boxes and the way in, to sit in the page's column.
 */
export function ReadPicker({ slug, lengths, children }: { slug: string; lengths: readonly Length[]; /** What goes between the two boxes and the Read button (the blurb). */ children?: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const [levelPick, setLevelPick] = useState<LevelId | null>(null);
  const [lengthPick, setLengthPick] = useState<Length | null>(null);

  const choiceRaw = useSyncExternalStore(subscribeChoice, readChoiceRaw, serverRaw);
  const answersRaw = useSyncExternalStore(subscribeAnswers, readAnswersRaw, serverRaw);
  const last = useMemo(() => parseChoice(choiceRaw)[slug], [choiceRaw, slug]);
  const signedUpAt = useMemo(() => levelForCefr(parseAnswers(answersRaw).level), [answersRaw]);

  const level: LevelId = levelPick ?? (last ? levelById(last.level)?.id : undefined) ?? signedUpAt ?? LEVELS[0].id;
  const lastLength = last && lengths.includes(last.length as Length) ? (last.length as Length) : undefined;
  const length: Length = lengthPick ?? lastLength ?? lengths[0];
  const levelInfo = levelById(level);
  const lengthInfo = LENGTHS.find((l) => l.pages === length);

  const start = () => {
    saveChoice(slug, level, length);
    router.push(`/read/${slug}/${LEVELS.find((l) => l.id === level)!.slug}/${length}`);
  };

  // A segmented control: a pale track with the chosen segment lit in the brand's cyan.
  const seg = (on: boolean) => `h-11 flex-1 rounded-full text-[14px] font-bold transition-colors ${on ? "btn-cyan" : "text-muted active:bg-accent-bright/15"}`;

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 text-[13px]">
        <section className="rounded-[22px] border border-accent-bright/25 bg-accent-bright/[0.07] p-3.5" aria-label={t("book.levels")}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent">{t("book.levels")}</h2>
            {levelInfo && <p className="text-end font-semibold text-foreground/80">{t(`level.${levelInfo.id}.name`)}</p>}
          </div>
          <div className="mt-2.5 flex gap-1 rounded-full bg-accent-bright/15 p-1" role="group" dir="ltr">
            {LEVELS.map((l) => <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => setLevelPick(l.id)} className={seg(level === l.id)}>{l.label}</button>)}
          </div>
          {levelInfo && <p className="mt-2.5 leading-snug text-muted">{t(`level.${levelInfo.id}.blurb`)}</p>}
        </section>

        <section className="rounded-[22px] border border-accent-bright/25 bg-accent-bright/[0.07] p-3.5" aria-label={t("book.lengths")}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent">{t("book.lengths")}</h2>
            {lengthInfo && <p className="text-end font-semibold text-foreground/80">{t(`length.${lengthInfo.pages}.name`)} · {t(`length.${lengthInfo.pages}.time`)}</p>}
          </div>
          <div className="mt-2.5 flex gap-1 rounded-full bg-accent-bright/15 p-1" role="group">
            {lengths.map((n) => <button key={n} type="button" aria-pressed={length === n} onClick={() => setLengthPick(n)} className={seg(length === n)}>{t("sheet.pages", { pages: n })}</button>)}
          </div>
        </section>
      </div>

      {children}

      {/* The way in stays on screen above the menu, wherever the page is scrolled to. */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-30 -mx-5 mt-auto bg-gradient-to-t from-background via-background to-transparent px-5 pb-2 pt-8">
        <button type="button" onClick={start} className="btn-cyan inline-flex h-14 w-full select-none items-center justify-center gap-2.5 rounded-full px-6 text-[17px] font-bold">
          {t("sheet.read")}
          <span className="grid size-8 place-items-center rounded-full bg-black/10" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 rtl:-scale-x-100"><path d="M5 12h13M12 5l7 7-7 7" /></svg>
          </span>
        </button>
      </div>
    </>
  );
}

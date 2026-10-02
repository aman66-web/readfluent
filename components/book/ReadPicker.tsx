"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { LEVELS, levelById, levelForCefr, type Length, type LevelId } from "@/lib/content/limits";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import { Pathway, PART_SIZE, type OutlineItem } from "@/components/book/Pathway";
import { useOutline } from "@/components/book/useOutline";
import { Paywall } from "@/components/paywall/Paywall";
import { ANSWERS_KEY, parseAnswers } from "@/lib/onboarding/answers";
import { canOpen } from "@/lib/plan";
import { usePlan } from "@/lib/pro/state";
import { CHOICE_KEY, PROGRESS_KEY, parseChoice, parseProgress, readPage, saveChoice, savePage, versionKey } from "@/lib/progress";
import { readRaw, subscribeTo } from "@/lib/store/local";

const subscribeChoice = subscribeTo(CHOICE_KEY);
const readChoiceRaw = () => readRaw(CHOICE_KEY);
const subscribeProgress = subscribeTo(PROGRESS_KEY);
const subscribeAnswers = subscribeTo(ANSWERS_KEY);
const readAnswersRaw = () => readRaw(ANSWERS_KEY);
// On the server there is no device storage: "" is what the first client render shows too.
const serverRaw = () => "";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Lock = () => <svg viewBox="0 0 24 24" className="size-3.5" {...stroke} strokeWidth={2.4} aria-hidden><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

/** A small titled card the page's sections sit in. */
function Card({ title, aside, children, label, tour }: { title: string; aside?: ReactNode; children: ReactNode; label?: string; tour?: string }) {
  return (
    <section data-tour={tour} className="sheet-card rounded-[24px] p-4" aria-label={label ?? title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ob-deep)]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Everything under a book's jacket: how big it is, where the reader has got to, what it is about, the level and
 * the length (both already picked: the level they said they were at when they signed up, or what they last chose
 * for this book, and the shortest length; a tap on another changes it), the book's path, and the way in. The Read
 * button carries on from where they were.
 */
export function ReadPicker({ slug, lengths, langs = [], outline: english = [], chapterNames, children }: { slug: string; /** The length this book has (its pages): the one it opens at. */ lengths: readonly Length[]; /** The languages (besides English) the book can be read in. */ langs?: readonly string[]; /** The book's moments in order, for the path (English; shown in the reader's language where there is a translation). */ outline?: readonly OutlineItem[]; /** One name for each chapter of ten pages, where the book has them. */ chapterNames?: readonly string[]; /** The "about" text. */ children?: ReactNode }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const outline = useOutline(slug, english);
  const [levelPick, setLevelPick] = useState<LevelId | null>(null);
  const [paywall, setPaywall] = useState(false);
  const { plan } = usePlan();

  const choiceRaw = useSyncExternalStore(subscribeChoice, readChoiceRaw, serverRaw);
  const answersRaw = useSyncExternalStore(subscribeAnswers, readAnswersRaw, serverRaw);
  const progressRaw = useSyncExternalStore(subscribeProgress, () => readRaw(PROGRESS_KEY), serverRaw);
  const last = useMemo(() => parseChoice(choiceRaw)[slug], [choiceRaw, slug]);
  const signedUpAt = useMemo(() => levelForCefr(parseAnswers(answersRaw).level), [answersRaw]);

  const level: LevelId = levelPick ?? (last ? levelById(last.level)?.id : undefined) ?? signedUpAt ?? LEVELS[0].id;
  // A book has one length (all its pages): no choice is offered.
  const length: Length = lengths[lengths.length - 1];
  const levelInfo = levelById(level);
  const learn = useMemo(() => parseAnswers(answersRaw).learn, [answersRaw]);

  const levelSlug = LEVELS.find((l) => l.id === level)!.slug;
  const reached = useMemo(() => parseProgress(progressRaw)[versionKey(slug, levelSlug, length)], [progressRaw, slug, levelSlug, length]);
  // A version already begun stays open; a longer one asks for the plan (lib/plan.ts; closed only once payments are live).
  const locked = (n: Length) => !canOpen(n, plan, readPage(slug, levelSlug, n) !== undefined);
  // `page` is where to open it: a tap on the path opens there; the Read button carries on from where they were.
  const start = (page?: number) => {
    if (locked(length)) { setPaywall(true); return; }
    saveChoice(slug, level, length);
    if (page !== undefined) savePage(slug, levelSlug, length, page);
    router.push(`/read/${slug}/${levelSlug}/${length}`);
  };

  const chapters = chapterNames?.length ?? Math.max(1, Math.ceil(outline.length / PART_SIZE));
  const share = reached === undefined ? 0 : Math.min(1, (reached + 1) / length);

  return (
    <>
      {/* How big it is, at the level and length picked. */}
      <dl aria-label={t("book.lengths")} className="sheet-card mt-6 grid grid-cols-3 divide-x divide-[var(--ob-line)] rounded-[24px] py-3.5 text-center rtl:divide-x-reverse">
        {[
          { icon: <path d="M6 3.5h9l3 3V20.5H6zM9 11h6M9 15h6" />, text: t("sheet.pages", { pages: length }) },
          { icon: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, text: t(`length.${length}.time` as "length.50.time") },
          { icon: <path d="M4 6h16M4 12h16M4 18h10" />, text: t("book.chapters", { n: chapters }) },
        ].map((x, i) => (
          <div key={i} className="flex min-w-0 flex-col items-center gap-1.5 px-2">
            <svg viewBox="0 0 24 24" className="size-5 text-[var(--ob-deep)]" {...stroke} aria-hidden>{x.icon}</svg>
            <dd className="text-[14px] font-bold leading-tight">{x.text}</dd>
          </div>
        ))}
      </dl>

      {/* Where they are, once they have started. */}
      {reached !== undefined && (
        <section className="mt-3 rounded-[24px] bg-accent-bright/20 p-4 shadow-[inset_0_0_0_1px_rgba(8,145,178,.25)]" aria-label={t("book.continue")}>
          <p className="text-[14.5px] font-bold">{t("book.yourPlace", { n: reached + 1, total: length })}</p>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[var(--ob-track)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} dir="ltr">
            <div className="h-full rounded-full bg-accent-bright" style={{ width: `${Math.max(4, share * 100)}%` }} />
          </div>
        </section>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {children && <Card title={t("book.about")}><div className="mt-2.5">{children}</div></Card>}

        {/* How hard the language is: one sentence, two or three a page. */}
        <Card title={t("book.levels")} aside={levelInfo && <p className="text-end text-[13px] font-semibold text-foreground/80">{t(`level.${levelInfo.id}.name`)}</p>}>
          <div data-tour="levels" className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label={t("book.levels")} dir="ltr">
            {LEVELS.map((l) => {
              const on = level === l.id;
              return (
                <button key={l.id} type="button" aria-pressed={on} onClick={() => setLevelPick(l.id)}
                        className={`opt flex h-[76px] flex-col items-center justify-center gap-0.5 rounded-2xl ${on ? "opt-on" : ""}`}>
                  <span className="text-[17px] font-extrabold tracking-[-0.01em]">{l.label}</span>
                  <span className={`text-[11.5px] font-semibold ${on ? "text-[var(--ob-deep)]" : "text-muted"}`}>{t(`level.${l.id}.name`)}</span>
                </button>
              );
            })}
          </div>
          {levelInfo && (
            <p className="mt-3 text-[13.5px] leading-snug text-muted">
              <span className="font-bold text-foreground">{t(`level.${levelInfo.id}.lines` as "level.A1A2.lines")}.</span> {t(`level.${levelInfo.id}.blurb`)}
            </p>
          )}

        </Card>

        {/* Whether the book opens in the language they are learning. */}
        {learn && learn !== "en" && (
          langs.includes(learn) ? (
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-bright/20 px-3.5 py-2 text-[13.5px] font-bold text-[var(--ob-deep)]">
              <svg viewBox="0 0 24 24" className="size-4" {...stroke} strokeWidth={2.4} aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              {t("book.langReady", { language: languageName(learn, locale) })}
            </p>
          ) : (
            <p className="sheet-card flex items-start gap-3 rounded-[20px] p-3.5 text-[13.5px] leading-snug text-muted">
              <svg viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-[var(--ob-deep)]" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" /></svg>
              {t("book.langNotYet", { language: languageName(learn, locale) })}
            </p>
          )
        )}
      </div>

      {outline.length > 0 && <Pathway slug={slug} level={levelSlug} length={length} outline={outline} chapters={chapterNames} onOpen={start} />}

      {/* The way in stays on screen above the menu, wherever the page is scrolled to. */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-30 -mx-5 mt-auto bg-gradient-to-t from-background via-background to-transparent px-5 pb-2 pt-8">
        <button type="button" data-tour="read" onClick={() => start()} className="btn-cyan inline-flex h-14 w-full select-none items-center justify-center gap-2.5 rounded-full px-6 text-[16.5px] font-semibold tracking-[-0.01em] active:scale-[0.98]">
          {t(reached === undefined ? "sheet.read" : "book.continue")}
          <span className="grid size-8 place-items-center rounded-full bg-black/10" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 rtl:-scale-x-100"><path d="M5 12h13M12 5l7 7-7 7" /></svg>
          </span>
        </button>
      </div>
      {paywall ? <Paywall onClose={() => setPaywall(false)} /> : null}
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { DotNumber } from "@/components/DotMatrix";
import type { CategoryId } from "@/lib/content/limits";
import { formatDate, formatList } from "@/lib/i18n";
import { formatReadingTime } from "@/lib/i18n/format";
import { useLocale, useT } from "@/lib/i18n/react";
import type { WhyId } from "@/lib/onboarding/answers";
import { DAILY_MINUTES } from "@/lib/onboarding/firstrun";
import { useStagedCount } from "./count";
import { GuideFrame, GuideHead, useGuide } from "./Guide";
import { useHold } from "./hold";
import { TickIcon } from "./ui";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * The plan: how long a day, where that goes, a promise, and the library being set
 * up — the end of the first run. What these screens say is what the app really
 * does: the daily time is the reader's goal, the shelves are the ones just picked,
 * and the totals are arithmetic on the time they chose (lib/onboarding/firstrun.ts).
 */

const DAILY_LABELS = ["daily.easy", "daily.steady", "daily.keen", "daily.allin"] as const;

/** "How much time will you give it each day?" — four goals, one picked. */
export function DailyScreen({ at, of, value, onPick, onBack, onContinue }: Nav & {
  value: number | null;
  onPick: (minutes: number) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const line = t("daily.line");
  const guide = useGuide(line);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={value !== null}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead guide={guide} line={line} sub={t("daily.sub")} />
        <div className="mt-7 grid grid-cols-2 gap-3" role="radiogroup" aria-label={line}>
          {DAILY_MINUTES.map((m, i) => {
            const on = value === m;
            return (
              <button key={m} type="button" role="radio" aria-checked={on} onClick={() => onPick(m)}
                      className={`guide-card wel-in relative flex flex-col items-start gap-3 rounded-[22px] p-4 text-start ${on ? "guide-card-on" : ""}`}
                      style={{ animationDelay: `${850 + i * 90}ms` }}>
                <span className="flex items-end gap-1.5">
                  <DotNumber value={m} cell={7} color={on ? "#0891B2" : "#0B1B22"} glow={false} label={t("daily.minutesLabel", { minutes: m })} />
                  <span className="ob-muted pb-0.5 text-[12px] font-bold uppercase tracking-[0.06em]">{t("daily.min")}</span>
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{t(DAILY_LABELS[i])}</span>
                  <span className="ob-muted mt-0.5 block text-[12.5px] leading-snug">{t("daily.year", { time: formatReadingTime(365 * m, locale) })}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </GuideFrame>
  );
}

/**
 * "Here's where ten minutes a day takes you" — a week, a month and a year of it, as
 * time spent reading. The year is the one lit up, and the bars are measured against
 * it, so the week and the month look like the start they are.
 */
export function FutureScreen({ at, of, minutes, why, onBack, onContinue }: Nav & {
  minutes: number;
  why: readonly WhyId[];
}) {
  const t = useT();
  const locale = useLocale();
  const line = t("future.line", { minutes });
  const guide = useGuide(line);
  const year = 365 * minutes;
  const rows = [
    { when: t("time.week"), minutes: 7 * minutes },
    { when: t("time.month"), minutes: 30 * minutes },
    { when: t("time.year"), minutes: year },
  ];
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead guide={guide} line={line} />

        <ol className="mt-7 space-y-2.5">
          {rows.map((r, i) => (
            <FutureRow key={i} when={r.when} share={r.minutes / year} top={r.minutes === year}
                       say={t("future.of", { time: formatReadingTime(r.minutes, locale) })} delay={900 + i * 450} />
          ))}
        </ol>

        {why.length > 0 && (
          <ul className="mt-6 space-y-2">
            {why.map((f, i) => (
              <li key={f} className="wel-in flex items-center gap-2.5 text-[14px] font-medium" style={{ animationDelay: `${2400 + i * 160}ms` }}>
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--ob-teal)] text-white" aria-hidden>{TickIcon}</span>
                {t(`future.${f}`)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </GuideFrame>
  );
}

function FutureRow({ when, share, top, say, delay }: { when: string; share: number; top: boolean; say: string; delay: number }) {
  return (
    <li className={`guide-card wel-in relative rounded-[20px] px-4 py-3.5 ${top ? "future-all" : ""}`} style={{ animationDelay: `${delay - 250}ms` }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="ob-muted shrink-0 text-[13px] font-semibold">{when}</span>
        <span className={`tabular text-end text-[15px] font-bold ${top ? "text-[var(--ob-deep)]" : ""}`}>{say}</span>
      </div>
      {/* How much of the year that is. */}
      <div className="guide-track mt-2.5 h-1.5 overflow-hidden rounded-full" aria-hidden>
        <div className="future-fill h-full rounded-full" style={{ width: `${Math.max(3, share * 100)}%`, animationDelay: `${delay}ms` }} />
      </div>
    </li>
  );
}

/** How long the promise has to be held. */
const HOLD_MS = 1500;

/**
 * "Make it a promise to yourself" — held, not tapped, so it means something. Or
 * skipped: nobody has to promise anything to get in.
 */
export function PledgeScreen({ at, of, minutes, done, onDone, onBack, onContinue }: Nav & {
  minutes: number;
  done: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const line = t("pledge.line");
  const guide = useGuide(line);
  const [today] = useState(() => new Date());
  const [p, setP] = useState(done ? 1 : 0);
  const at01 = useRef(done ? 1 : 0);
  const raf = useRef(0);

  // Holding fills the ring; letting go early drains it again, faster.
  const run = (dir: 1 | -1) => {
    cancelAnimationFrame(raf.current);
    let last = performance.now();
    const step = (ts: number) => {
      const dt = ts - last;
      last = ts;
      at01.current = Math.min(1, Math.max(0, at01.current + (dir * dt) / (dir > 0 ? HOLD_MS : 450)));
      setP(at01.current);
      if (dir > 0 && at01.current >= 1) {
        try { navigator.vibrate?.(35); } catch { /* not a phone that buzzes */ }
        onDone();
        return;
      }
      if (dir > 0 || at01.current > 0) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const press = () => { if (!done) run(1); };
  const release = () => { if (!done && at01.current < 1) run(-1); };
  const hold = useHold<HTMLButtonElement>(press, release);

  const C = 2 * Math.PI * 62;
  const date = formatDate(today, locale);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={done}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead guide={guide} line={line} />

        <figure className="wel-in guide-card relative mt-7 rounded-[24px] px-6 py-6" style={{ animationDelay: "900ms" }}>
          <blockquote className="ed-serif text-[23px] italic leading-[1.3]">{t("pledge.quote", { minutes })}</blockquote>
          <figcaption className="ob-faint mt-3 text-[12px] font-semibold uppercase tracking-[0.08em]">{date}</figcaption>
        </figure>

        <div className="mt-8 flex flex-1 flex-col items-center justify-center">
          <button ref={hold} type="button" aria-label={t("pledge.hold")} aria-pressed={done}
                  onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(); } }}
                  onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") release(); }}
                  className={`pledge-ring wel-in relative grid size-[150px] place-items-center rounded-full select-none [-webkit-touch-callout:none] ${done ? "pledge-done" : ""}`}
                  style={{ animationDelay: "1200ms" }}>
            <svg viewBox="0 0 150 150" className="absolute inset-0 size-full -rotate-90" aria-hidden>
              <circle cx="75" cy="75" r="62" fill="none" stroke="#E2EBEF" strokeWidth="7" />
              <circle cx="75" cy="75" r="62" fill="none" stroke="url(#pledge-g)" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
              <defs>
                <linearGradient id="pledge-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#67E8F9" /><stop offset=".6" stopColor="#22D3EE" /><stop offset="1" stopColor="#0E7490" />
                </linearGradient>
              </defs>
            </svg>
            <span className="pledge-core grid size-[104px] place-items-center rounded-full" aria-hidden>
              {done ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="pledge-tick size-11"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="size-11 opacity-80">
                  {/* A fingerprint's whorls: press here. */}
                  <path d="M8 20c-1-2-1.5-4-1.5-6a5.5 5.5 0 0 1 11 0c0 1.2-.1 2.3-.4 3.4" />
                  <path d="M10.5 20.5c-.7-1.9-1-3.9-1-6.5a2.5 2.5 0 0 1 5 0c0 2.4-.3 4.5-1 6.3" />
                  <path d="M12 14c0 2.3.2 4.4.9 6.6" />
                  <path d="M5 10.5A7.5 7.5 0 0 1 19 9" />
                </svg>
              )}
            </span>
            {done && Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="pledge-spark" style={{ ["--a" as string]: `${i * 30}deg` }} aria-hidden />
            ))}
          </button>
          <p className="wel-in ob-muted mt-4 text-[14px] font-semibold" style={{ animationDelay: "1300ms" }} aria-live="polite">
            {done ? t("pledge.done") : t("pledge.hold")}
          </p>
          {/* A promise nobody is made to keep. */}
          {!done && (
            <button type="button" onClick={onContinue}
                    className="ob-faint wel-in mt-3 inline-flex h-11 items-center px-4 text-[13.5px] font-semibold transition-colors"
                    style={{ animationDelay: "1400ms" }}>
              {t("pledge.skip")}
            </button>
          )}
        </div>
      </div>
    </GuideFrame>
  );
}

/**
 * How "Building your library…" fills: about seven seconds, in uneven stretches that
 * slow and pause just before each line is ticked (at 22, 44, 66 and 88), so it
 * reads as work being done.
 */
const BUILDING: readonly (readonly [number, number])[] = [
  [12, 520], [20, 680], [22, 420],
  [35, 560], [42, 640], [44, 460],
  [57, 520], [64, 700], [66, 420],
  [79, 560], [86, 620], [88, 480],
  [96, 540], [100, 420],
];

/** "Building your library…" — what was chosen, set up, then the way in. */
export function ReadyScreen({ at, of, interests, minutes, onBack, onContinue }: Nav & {
  interests: readonly CategoryId[];
  minutes: number;
}) {
  const pct = useStagedCount(BUILDING, 500);
  const t = useT();
  const locale = useLocale();
  const done = pct >= 100;
  const line = done ? t("ready.done") : t("ready.building");
  const guide = useGuide(line);
  const names = formatList(interests.slice(0, 2).map((id) => t(`cat.${id}`)), locale);
  const more = interests.length - 2;
  const shelves = interests.length === 0 ? t("ready.every") : more > 0 ? t("ready.shelvesMore", { names, more }) : t("ready.shelves", { names });
  const items = [shelves, t("ready.goal", { minutes }), t("ready.words"), t("ready.cards")];
  const C = 2 * Math.PI * 54;
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={done} continueLabel={t("ready.start")}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead key={line} guide={guide} line={line} />

        <div className="mt-8 flex justify-center">
          <div className={`relative grid size-[132px] place-items-center ${done ? "ready-done" : ""}`}>
            <svg viewBox="0 0 132 132" className="absolute inset-0 size-full -rotate-90" aria-hidden>
              <circle cx="66" cy="66" r="54" fill="none" stroke="#E2EBEF" strokeWidth="6" />
              <circle cx="66" cy="66" r="54" fill="none" stroke="url(#ready-g)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
              <defs>
                <linearGradient id="ready-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#67E8F9" /><stop offset=".6" stopColor="#22D3EE" /><stop offset="1" stopColor="#0E7490" />
                </linearGradient>
              </defs>
            </svg>
            <span className="flex items-end gap-1">
              <DotNumber value={pct} cell={5} color="#0E7490" glow={false} label={`${pct}%`} />
              <span className="ob-muted pb-0.5 text-[13px] font-bold">%</span>
            </span>
          </div>
        </div>

        <ul className="mt-8 space-y-2.5">
          {items.map((text, i) => {
            const shown = pct >= 12 + i * 22;
            const ticked = pct >= 22 + i * 22;
            return (
              <li key={i} className={`guide-card relative flex items-center gap-3 rounded-[18px] px-4 py-3.5 transition-opacity duration-500 ${shown ? "opacity-100" : "opacity-0"}`}>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-300 ${ticked ? "bg-[var(--ob-teal)] text-white" : "bg-black/[0.06] text-transparent"}`} aria-hidden>
                  {ticked
                    ? <span className="ready-tick grid place-items-center">{TickIcon}</span>
                    : <span className="ready-spin block size-3.5 rounded-full border-2 border-black/15 border-t-black/45" />}
                </span>
                <span className="text-[14.5px] font-semibold leading-snug">{text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </GuideFrame>
  );
}

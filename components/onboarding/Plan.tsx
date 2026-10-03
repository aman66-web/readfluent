"use client";

import { useRef, useState } from "react";
import { DotNumber } from "@/components/DotMatrix";
import { formatDate, languageName } from "@/lib/i18n";
import { APP_NAME } from "@/lib/brand";
import { formatReadingTime } from "@/lib/i18n/format";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { formatDuration, pathFrom } from "@/lib/xp/path";
import type { Cefr } from "@/lib/xp/levels";
import { DAILY_MINUTES, MAX_DAILY_MINUTES, isDailyMinutes } from "@/lib/onboarding/firstrun";
import { GuideFrame, GuideHead, useGuide } from "./Guide";
import { useHold } from "./hold";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * The plan: how long a day, where that goes, a promise, and the library being set
 * up — the end of the first run. What these screens say is what the app really
 * does: the daily time is the reader's goal, the shelves are the ones just picked,
 * and the totals are arithmetic on the time they chose (lib/onboarding/firstrun.ts).
 */

/**
 * "How much time can you commit to learning {language} each day?" — six answers, one
 * picked. Under each, what that adds up to in a year of reading. This is the reader's
 * daily goal, and the next screen works out from it how long each level takes.
 */
export function TimeScreen({ at, of, learn, value, onPick, onBack, onContinue }: Nav & {
  learn: LanguageCode | null;
  value: number | null;
  onPick: (minutes: number) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const line = t("time.line", { language: languageName(learn ?? "en", locale) });
  const guide = useGuide(line);
  // Custom: the reader's own number. It is on when they tapped it, or when what is saved is not one of the choices.
  const preset = value !== null && (DAILY_MINUTES as readonly number[]).includes(value);
  const [asking, setAsking] = useState(false);
  const custom = asking || (value !== null && !preset);
  const [text, setText] = useState(() => (value !== null && !preset ? String(value) : ""));
  const box = useRef<HTMLInputElement>(null);
  const typed = Number(text);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={custom ? isDailyMinutes(typed) : value !== null}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead key={line} guide={guide} line={line} sub={t("time.sub", { app: APP_NAME })} mood="ready" />
        <div className="mt-6 grid grid-cols-2 gap-3" role="group" aria-label={line}>
          {DAILY_MINUTES.map((m, i) => {
            const on = !custom && value === m;
            return (
              <button key={m} type="button" aria-pressed={on} onClick={() => { setAsking(false); setText(""); onPick(m); }}
                      className={`guide-card wel-in relative flex flex-col items-start gap-3 rounded-[22px] p-4 text-start ${on ? "guide-card-on" : ""}`}
                      style={{ animationDelay: `${850 + i * 80}ms` }}>
                <span className="flex items-end gap-1.5" dir="ltr">
                  <DotNumber value={m} cell={7} color={on ? "#0891B2" : "#0B1B22"} glow={false} label={t("daily.minutesLabel", { minutes: m })} />
                  <span className="ob-muted pb-0.5 text-[12px] font-bold uppercase tracking-[0.06em]">{t("daily.min")}</span>
                </span>
                <span className="ob-muted block text-[12.5px] leading-snug">{t("daily.year", { time: formatReadingTime(365 * m, locale) })}</span>
              </button>
            );
          })}
          {/* Their own number of minutes. */}
          <div className={`guide-card wel-in relative flex flex-col items-start justify-between gap-3 rounded-[22px] p-4 text-start ${custom ? "guide-card-on" : ""}`}
               style={{ animationDelay: `${850 + DAILY_MINUTES.length * 80}ms` }}>
            {custom ? (
              <>
                <span className="flex items-end gap-1.5" dir="ltr">
                  <input ref={box} autoFocus type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={text} placeholder="0" aria-label={t("daily.customLabel")}
                         onChange={(e) => {
                           const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                           setText(digits);
                           if (isDailyMinutes(Number(digits))) onPick(Number(digits));
                         }}
                         className="tabular w-[3.2ch] bg-transparent text-[40px] font-bold leading-none tracking-[-0.02em] text-[var(--ob-deep)] outline-none placeholder:text-black/20" />
                  <span className="ob-muted pb-0.5 text-[12px] font-bold uppercase tracking-[0.06em]">{t("daily.min")}</span>
                </span>
                <span className="ob-muted block text-[12.5px] leading-snug">
                  {isDailyMinutes(typed) ? t("daily.year", { time: formatReadingTime(365 * typed, locale) }) : t("daily.customLabel")}
                  {text !== "" && !isDailyMinutes(typed) ? ` (1–${MAX_DAILY_MINUTES})` : ""}
                </span>
              </>
            ) : (
              <button type="button" onClick={() => { setAsking(true); }} className="flex h-full w-full flex-col items-start justify-between gap-3 text-start">
                <span className="grid size-[46px] place-items-center rounded-full bg-black/[0.06] text-[var(--ob-deep)]" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[22px]"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" /></svg>
                </span>
                <span className="text-[17px] font-semibold">{t("daily.custom")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </GuideFrame>
  );
}

/**
 * "At 20 minutes a day, you could reach B2 in about …" — how long each level up takes, as a
 * ladder of bars (the longer the climb, the longer the bar), from the level they are at to C2.
 * The headline is the next level. It is the same arithmetic the dashboard keeps (lib/xp/path),
 * and it says it is an estimate.
 */
export function PathScreen({ at, of, level, minutes, onBack, onContinue }: Nav & {
  level: Cefr | null;
  minutes: number;
}) {
  const t = useT();
  const locale = useLocale();
  const steps = pathFrom(level, minutes);
  const next = steps[0];
  const line = next
    ? t("path.line", { minutes, level: next.level, time: formatDuration(next.days, locale) })
    : t("path.top", { minutes });
  const guide = useGuide(line);
  const longest = steps.length ? steps[steps.length - 1].days : 1;
  const n = (v: number) => v.toLocaleString(locale);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead key={line} guide={guide} line={line} mood="cheer" />
        {steps.length > 0 && (
          <>
            <p className="ob-muted mt-6 text-[12px] font-bold uppercase tracking-[0.1em]">{t("path.ladder")}</p>
            <ol className="mt-3 space-y-2.5">
              {steps.map((s, i) => (
                <li key={s.level} className={`guide-card wel-in relative rounded-[20px] px-4 py-3 ${i === 0 ? "guide-card-on" : ""}`} style={{ animationDelay: `${900 + i * 280}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className="tabular w-8 shrink-0 text-[16px] font-extrabold text-[var(--ob-deep)]">{s.level}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{t(`levelname.${s.level}`)}</span>
                    <span className="tabular shrink-0 text-end">
                      <span className="block text-[14px] font-bold">{t("path.days", { n: n(s.days) })}</span>
                      {s.days >= 60 && <span className="ob-muted block text-[11.5px] font-medium">≈ {formatDuration(s.days, locale)}</span>}
                    </span>
                  </div>
                  <div className="guide-track mt-2.5 h-1.5 overflow-hidden rounded-full" aria-hidden>
                    <div className="future-fill h-full rounded-full" style={{ width: `${Math.max(4, (s.days / longest) * 100)}%`, animationDelay: `${1000 + i * 280}ms` }} />
                  </div>
                </li>
              ))}
            </ol>
            <p className="ob-faint wel-in mt-4 text-[12px] leading-snug" style={{ animationDelay: `${1200 + steps.length * 280}ms` }}>{t("path.note")}</p>
          </>
        )}
      </div>
    </GuideFrame>
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
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue continueLabel={done ? undefined : t("pledge.skip")}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead guide={guide} line={line} mood="cheer" />

        <figure className="wel-in guide-card relative mt-4 rounded-[24px] px-6 py-4" style={{ animationDelay: "900ms" }}>
          <blockquote className="ed-serif text-[21px] italic leading-[1.3]">{t("pledge.quote", { minutes })}</blockquote>
          <figcaption className="ob-faint mt-3 text-[12px] font-semibold uppercase tracking-[0.08em]">{date}</figcaption>
        </figure>

        <div className="mt-4 flex flex-1 flex-col items-center [justify-content:safe_center]">
          <p className="wel-in ob-muted mb-3 text-[14px] font-semibold" style={{ animationDelay: "1300ms" }} aria-live="polite">
            {done ? t("pledge.done") : t("pledge.hold")}
          </p>
          <button ref={hold} type="button" aria-label={t("pledge.hold")} aria-pressed={done}
                  onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(); } }}
                  onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") release(); }}
                  className={`pledge-ring wel-in relative grid size-[min(140px,18dvh)] shrink-0 place-items-center rounded-full select-none [-webkit-touch-callout:none] ${done ? "pledge-done" : ""}`}
                  style={{ animationDelay: "1200ms" }}>
            <svg viewBox="0 0 150 150" className="absolute inset-0 size-full -rotate-90" aria-hidden>
              <circle cx="75" cy="75" r="62" fill="none" stroke="#E2EBEF" strokeWidth="7" />
              <circle cx="75" cy="75" r="62" fill="none" stroke="url(#pledge-g)" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={done ? 0 : C * (1 - p)} />
              <defs>
                <linearGradient id="pledge-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#67E8F9" /><stop offset=".6" stopColor="#22D3EE" /><stop offset="1" stopColor="#0E7490" />
                </linearGradient>
              </defs>
            </svg>
            <span className="pledge-core grid size-[70%] place-items-center rounded-full" aria-hidden>
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
          {/* A promise nobody is made to keep: until it is made, the button below skips it. */}
        </div>
      </div>
    </GuideFrame>
  );
}

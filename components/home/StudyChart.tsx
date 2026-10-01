"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { localDay, series, type Ledger } from "@/lib/xp/ledger";
import { dayDate, useToday } from "@/lib/xp/today";

/**
 * How the reading is going: minutes a day, as bars, as a line, and by book, over this
 * week or the last thirty days. Two ranges above, three panes swiped between, a dot for
 * each. Adapted from the first app's dashboard graph and drawn in this app's cyan: the
 * panes share one hue, because all three are one measure (time) shown three ways.
 */

type Range = "week" | "month";
const CHART_H = 72;
const INK = "#0E7490";
const WELL = "rgba(14,116,144,.12)";
const LINE = "rgba(14,116,144,.3)";

interface Day { date: string; minutes: number }

function bounds(range: Range, now: Date): { from: string; to: string } {
  if (range === "month") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    return { from: localDay(start), to: localDay(now) };
  }
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: localDay(monday), to: localDay(sunday) };
}

interface ChartProps { ledger: Ledger; goal: number; bookName: (slug: string) => string }

/** The chart waits for the reader's own day: the server cannot know it, and "today" is what it highlights. */
export function StudyChart(props: ChartProps) {
  const today = useToday();
  if (!today) return <div aria-hidden className="h-[220px]" />;
  return <StudyChartBody {...props} today={today} />;
}

/** The chart itself, for a day that is known. */
export function StudyChartBody({ ledger, goal, bookName, today }: ChartProps & { today: string }) {
  const t = useT();
  const locale = useLocale();
  const [range, setRange] = useState<Range>("week");
  const [pane, setPane] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const b = useMemo(() => bounds(range, dayDate(today)), [range, today]);
  const days = useMemo(() => series(ledger, b.from, b.to), [ledger, b]);
  const total = days.reduce((n, d) => n + d.minutes, 0);
  const elapsed = days.filter((d) => d.date <= today).length;
  const avg = Math.round(total / Math.max(1, elapsed));

  const share = useMemo(() => {
    const by = new Map<string, number>();
    for (const [date, s] of Object.entries(ledger.days)) {
      if (date < b.from || date > b.to) continue;
      for (const [slug, sec] of Object.entries(s.books)) by.set(slug, (by.get(slug) ?? 0) + sec);
    }
    const rows = [...by.entries()].map(([id, sec]) => ({ id, name: bookName(id), minutes: sec / 60 })).sort((x, y) => y.minutes - x.minutes);
    if (rows.length <= 5) return rows;
    const rest = rows.slice(4).reduce((n, r) => n + r.minutes, 0);
    return [...rows.slice(0, 4), { id: "other", name: t("chart.other"), minutes: rest }];
  }, [ledger, b, bookName, t]);

  const title = range === "week" ? t("chart.week") : t("chart.month");
  const PANES = [t("chart.byDay"), t("chart.trend"), t("chart.byBook")];
  const n = (v: number) => v.toLocaleString(locale);

  return (
    <section className="relative mt-3 overflow-hidden rounded-[26px] px-5 pb-1.5 pt-4" style={{ background: "#E7F7FB", color: "#082F3E" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tabular text-[28px] font-bold leading-none tracking-[-0.03em]">{n(total)}</p>
          <p className="mt-1 text-[12px] font-semibold">{title} <span className="tabular opacity-70">· {t("chart.avg", { n: n(avg) })}</span></p>
        </div>
        <p className="tabular mt-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: WELL }}>{t("chart.goal", { minutes: goal })}</p>
      </div>

      <div className="-mb-1 mt-2 flex gap-1.5" role="group" aria-label={PANES[0]}>
        {([["week", t("chart.rangeWeek")], ["month", t("chart.rangeMonth")]] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setRange(key)} aria-pressed={range === key} className="relative flex h-11 shrink-0 items-center whitespace-nowrap text-[13px] font-semibold">
            <span className="rounded-full px-3.5 py-1.5" style={range === key ? { background: INK, color: "#fff" } : { background: WELL, color: "rgba(8,47,62,.7)" }}>{label}</span>
          </button>
        ))}
      </div>

      <div ref={strip} dir="ltr"
           onScroll={(e) => { const el = e.currentTarget; setPane(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}
           className="no-scrollbar mt-1.5 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
        <Pane label={`${PANES[0]}: ${title} ${total}`}><Bars days={days} goal={goal} locale={locale} today={today} /></Pane>
        <Pane label={`${PANES[1]}: ${title} ${total}`}><Line days={days} goal={goal} locale={locale} /></Pane>
        <Pane label={`${PANES[2]}: ${share.map((r) => `${r.name} ${Math.round(r.minutes)}`).join(", ")}`}><Share rows={share} total={share.reduce((s, r) => s + r.minutes, 0)} empty={t("chart.nothing")} /></Pane>
      </div>

      <div className="mt-1 flex items-center justify-center">
        {PANES.map((name, i) => (
          <button key={name} type="button" aria-label={name} aria-current={pane === i ? "true" : undefined}
                  onClick={() => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: "smooth" })}
                  className="-my-2.5 grid h-11 w-11 place-items-center">
            <span className="block size-2 rounded-full transition-colors" style={{ background: pane === i ? INK : LINE }} />
          </button>
        ))}
      </div>
    </section>
  );
}

function Pane({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="w-full shrink-0 snap-center snap-always" role="img" aria-label={label}>{children}</div>;
}

/* ── the days as bars ───────────────────────────────────────────────────── */
function Bars({ days, goal, locale, today }: { days: Day[]; goal: number; locale: LanguageCode; today: string }) {
  const top = Math.max(goal * 1.1, ...days.map((d) => d.minutes), 1);
  const many = days.length > 10;
  const labels = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    return days.map((d) => f.format(new Date(`${d.date}T12:00:00`)));
  }, [days, locale]);
  const spread = useMemo(() => {
    if (!many || !days.length) return [];
    const f = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    const at = (i: number) => f.format(new Date(`${days[i].date}T12:00:00`));
    return [at(0), at(Math.floor((days.length - 1) / 2)), at(days.length - 1)];
  }, [days, locale, many]);
  const cols = { gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` };
  return (
    <div aria-hidden>
      {!many && (
        <div className="grid gap-1.5" style={cols}>
          {days.map((d) => <span key={d.date} className="tabular block h-4 text-center text-[11px] font-semibold leading-4">{d.minutes || ""}</span>)}
        </div>
      )}
      <div className="relative mt-1" style={{ height: CHART_H }}>
        <div className="grid h-full gap-1.5" style={cols}>
          {days.map((d, i) => (
            <div key={d.date} className={`relative mx-auto h-full w-full overflow-hidden rounded-full ${many ? "max-w-[10px]" : "max-w-[22px]"}`} style={{ background: WELL }}>
              {d.minutes > 0 && (
                <div className="chart-fill absolute inset-x-0 bottom-0 rounded-full"
                     style={{ background: INK, height: `${Math.max(many ? 9 : 24, (d.minutes / top) * 100)}%`, opacity: d.date === today ? 1 : 0.68, animationDelay: `${Math.min(i, 12) * 35}ms` }} />
              )}
            </div>
          ))}
        </div>
        {goal > 0 && goal <= top && <div className="pointer-events-none absolute inset-x-0 border-t border-dashed" style={{ bottom: (goal / top) * CHART_H, borderColor: LINE }} />}
      </div>
      {many ? (
        <div className="mt-1.5 flex justify-between text-[11px] font-bold opacity-70">{spread.map((l, i) => <span key={i}>{l}</span>)}</div>
      ) : (
        <div className="mt-1.5 grid gap-1.5" style={cols}>
          {days.map((d, i) => <span key={d.date} className="block truncate text-center text-[11px] font-bold" style={{ opacity: d.date === today ? 1 : 0.62 }}>{labels[i]}</span>)}
        </div>
      )}
    </div>
  );
}

/* ── the same days as a line ───────────────────────────────────────────── */
function Line({ days, goal, locale }: { days: Day[]; goal: number; locale: LanguageCode }) {
  const W = 320;
  const H = CHART_H;
  const top = Math.max(goal * 1.15, ...days.map((d) => d.minutes), 1);
  const x = (i: number) => (days.length < 2 ? W / 2 : (i / (days.length - 1)) * W);
  const y = (m: number) => H - (m / top) * H;
  const line = days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.minutes).toFixed(1)}`).join(" ");
  const ends = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    return days.length ? [f.format(new Date(`${days[0].date}T12:00:00`)), f.format(new Date(`${days[days.length - 1].date}T12:00:00`))] : ["", ""];
  }, [days, locale]);
  return (
    <div aria-hidden>
      <div className="h-4" />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height: CHART_H }}>
        <defs>
          <linearGradient id="study-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK} stopOpacity="0.28" />
            <stop offset="100%" stopColor={INK} stopOpacity="0" />
          </linearGradient>
        </defs>
        {goal > 0 && goal <= top && <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke={LINE} strokeWidth="1" strokeDasharray="4 4" />}
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#study-line-fill)" />
        <path d={line} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {days.length > 0 && <circle cx={x(days.length - 1)} cy={y(days[days.length - 1].minutes)} r="4" fill={INK} vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="mt-1.5 flex justify-between text-[11px] font-bold opacity-70"><span>{ends[0]}</span><span>{ends[1]}</span></div>
    </div>
  );
}

/* ── where the time went ────────────────────────────────────────────────── */
function Share({ rows, total, empty }: { rows: { id: string; name: string; minutes: number }[]; total: number; empty: string }) {
  if (total <= 0 || rows.length === 0) {
    return <div className="grid text-[12.5px] font-medium opacity-70" style={{ height: CHART_H + 38 }}><span className="self-center">{empty}</span></div>;
  }
  const R = 54;
  const C = 2 * Math.PI * R;
  const slices = rows.reduce<{ id: string; name: string; minutes: number; frac: number; at: number }[]>((acc, r) => {
    const prev = acc[acc.length - 1];
    return [...acc, { ...r, frac: r.minutes / total, at: prev ? prev.at + prev.frac : 0 }];
  }, []);
  // Shares that add up to a hundred: round down, then give the leftover points to the biggest remainders.
  const pct = (() => {
    const exact = rows.map((r) => (r.minutes / total) * 100);
    const out = exact.map(Math.floor);
    const left = 100 - out.reduce((n, v) => n + v, 0);
    const order = exact.map((v, i) => ({ i, rem: v - Math.floor(v) })).sort((a, b) => b.rem - a.rem);
    for (let k = 0; k < left; k++) out[order[k % order.length].i] += 1;
    return out;
  })();
  return (
    <div className="flex items-center gap-4" style={{ minHeight: CHART_H + 38 }} aria-hidden>
      <svg viewBox="0 0 140 140" className="size-[124px] shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke={WELL} strokeWidth="22" />
        {slices.map((r, i) => {
          const len = Math.max(0, r.frac * C - 3);
          return <circle key={r.id} cx="70" cy="70" r={R} fill="none" stroke={INK} strokeOpacity={1 - i * 0.17} strokeWidth="22" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-r.at * C} />;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5" dir="auto">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: INK, opacity: 1 - i * 0.17 }} />
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{r.name}</span>
            <span className="tabular shrink-0 text-[12px] font-bold opacity-70">{pct[i]}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

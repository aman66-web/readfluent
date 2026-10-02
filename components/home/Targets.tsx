"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { accountAvailable } from "@/components/onboarding/SignIn";
import { useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { EMPTY_SRS, SRS_KEY, parseSrs } from "@/lib/srs/store";
import { SOCIAL_KEY, parseSocial } from "@/lib/social/cache";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { dailyTargets, progressOf, type Target, type TargetId } from "@/lib/targets";
import { SAVED_KEY, parseSaved } from "@/lib/words/saved";
import { DEFAULT_MINUTES } from "@/lib/onboarding/firstrun";
import { LEDGER_KEY, dayOf, localDay, parseLedger } from "@/lib/xp/ledger";
import { dayDate, useToday } from "@/lib/xp/today";

const subLedger = subscribeTo(LEDGER_KEY);
const subSaved = subscribeTo(SAVED_KEY);
const subSrs = subscribeTo(SRS_KEY);
const subSocial = subscribeTo(SOCIAL_KEY);
const server = () => "";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS: Record<TargetId, ReactNode> = {
  pages: <svg viewBox="0 0 24 24" className="size-5" {...stroke} aria-hidden><path d="M12 6.5C10.2 5 7.6 4.5 4 4.8V18c3.6-.3 6.2.2 8 1.7 1.8-1.5 4.4-2 8-1.7V4.8c-3.6-.3-6.2.2-8 1.7z" /><path d="M12 6.5v13.2" /></svg>,
  flashcards: <svg viewBox="0 0 24 24" className="size-5" {...stroke} aria-hidden><rect x="3" y="7" width="14" height="11" rx="2.5" /><path d="M7 7V6a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H17" /></svg>,
  xp: <svg viewBox="0 0 24 24" className="size-5" {...stroke} aria-hidden><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>,
  words: <svg viewBox="0 0 24 24" className="size-5" {...stroke} aria-hidden><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" /></svg>,
  friend: <svg viewBox="0 0 24 24" className="size-5" {...stroke} aria-hidden><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M18 8v6M15 11h6" /></svg>,
};

/**
 * "Today's targets": a few small things to do today, with how far along each one is. Read from what the
 * device keeps (the ledger, saved words, flashcards), so it works with no account and no network.
 */
export function Targets() {
  const t = useT();
  const a = useAnswers();
  const today = useToday();
  const ledgerRaw = useSyncExternalStore(subLedger, () => readRaw(LEDGER_KEY), server);
  const savedRaw = useSyncExternalStore(subSaved, () => readRaw(SAVED_KEY), server);
  const srsRaw = useSyncExternalStore(subSrs, () => readRaw(SRS_KEY), server);
  const socialRaw = useSyncExternalStore(subSocial, () => readRaw(SOCIAL_KEY), server);

  const targets = useMemo(() => {
    if (!today) return [] as Target[];
    const ledger = parseLedger(ledgerRaw);
    const saved = Object.values(parseSaved(savedRaw));
    const srs = srsRaw ? parseSrs(srsRaw) : EMPTY_SRS;
    const savedToday = saved.filter((w) => localDay(new Date(w.at)) === today).length;
    const friends = parseSocial(socialRaw).friends;
    return dailyTargets({
      minutes: a.daily ?? DEFAULT_MINUTES,
      day: dayOf(ledger, today),
      savedToday,
      reviewedToday: srs.log[today] ?? 0,
      friend: friends > 0 ? "done" : accountAvailable() ? "todo" : "hidden",
    });
  }, [today, ledgerRaw, savedRaw, srsRaw, socialRaw, a.daily]);

  if (targets.length === 0) return <div aria-hidden className="mt-3 h-[300px]" />;
  const { done, total } = progressOf(targets);
  const all = done === total;
  void dayDate;
  return (
    <section data-tour="targets" className="mt-3 rounded-[26px] border border-border bg-surface p-4" aria-label={t("targets.title")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.01em]">{t("targets.title")}</h2>
        <span className="tabular inline-flex h-7 items-center rounded-full bg-accent-bright/20 px-3 text-[12px] font-bold text-accent">{t("targets.done", { done, total })}</span>
      </div>

      {all && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-2xl bg-accent-bright/20 px-3.5 py-3 text-[14px] font-semibold text-foreground">
          <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-accent" fill="currentColor" aria-hidden><path d="M12 2l2.2 6.3L21 9l-5 4.4L17.6 20 12 16.6 6.4 20 8 13.4 3 9l6.8-.7z" /></svg>
          {t("targets.allDone")}
        </p>
      )}

      <ul className="mt-3 grid grid-cols-2 gap-2.5">
        {targets.map((x) => <Row key={x.id} target={x} />)}
      </ul>
    </section>
  );
}

const RING = 2 * Math.PI * 27;

function Row({ target: x }: { target: Target }) {
  const t = useT();
  const label =
    x.id === "pages" ? t("targets.pages", { n: x.goal }) :
    x.id === "xp" ? t("targets.xp", { n: x.goal }) :
    x.id === "words" ? t("targets.words", { n: x.goal }) :
    x.id === "flashcards" ? t("targets.flashcards") : t("targets.friend");
  const share = x.goal > 0 ? Math.min(1, x.current / x.goal) : x.done ? 1 : 0;
  const body = (
    <>
      {/* A ring that fills as the target is reached; the picture in the middle becomes a tick when it is. */}
      <span className="relative grid size-[68px] place-items-center" dir="ltr" role={x.goal > 1 ? "progressbar" : undefined} aria-valuemin={0} aria-valuemax={x.goal} aria-valuenow={x.current} aria-label={label}>
        <svg viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r="27" fill="none" stroke="var(--accent-bright)" strokeOpacity=".2" strokeWidth="6" />
          <circle cx="32" cy="32" r="27" fill="none" stroke={x.done ? "var(--accent)" : "var(--accent-bright)"} strokeWidth="6" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - (x.done ? 1 : share))} className="transition-[stroke-dashoffset] duration-700" />
        </svg>
        <span className={`grid size-9 place-items-center rounded-full ${x.done ? "bg-accent-bright text-on-cyan" : "text-accent"}`}>
          {x.done ? <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : ICONS[x.id]}
        </span>
      </span>
      <span className={`mt-2 block text-[13px] font-semibold leading-tight ${x.done ? "text-muted" : ""}`}>{label}</span>
      {x.goal > 1 && <span className="tabular mt-1 block text-[11.5px] font-bold text-accent" dir="ltr">{x.current} / {x.goal}</span>}
    </>
  );
  const cls = "flex h-full flex-col items-center rounded-[22px] bg-background px-2.5 pb-3 pt-3 text-center shadow-[0_10px_22px_-18px_rgba(8,47,60,.55)]";
  return (
    <li>
      {x.href && !x.done ? <Link href={x.href} className={`${cls} active:scale-[0.98] transition-transform`}>{body}</Link> : <div className={cls}>{body}</div>}
    </li>
  );
}

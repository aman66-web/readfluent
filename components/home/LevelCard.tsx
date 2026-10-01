"use client";

import { useState } from "react";
import { DotNumber } from "@/components/DotMatrix";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { XP, levelFromXp } from "@/lib/xp/levels";

/**
 * The top of the dashboard: the reader's level (A1 to C2), a bar that fills toward
 * the next one, and how much XP that still takes. XP comes from reading (lib/xp); the
 * little list under "How to earn XP" says exactly how, from the same numbers the reader
 * pays out, so what it promises is what happens.
 */
export function LevelCard({ xp, learn }: { xp: number; learn: LanguageCode | null }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const s = levelFromXp(xp);
  const n = (v: number) => v.toLocaleString(locale);
  const language = languageName(learn ?? "en", locale);
  return (
    <section className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-[0_18px_40px_-22px_rgba(8,47,62,.75)]"
             style={{ background: "linear-gradient(155deg, #0E7490 0%, #0A4B62 55%, #082F3E 100%)" }}>
      <div className="pointer-events-none absolute -end-10 -top-12 size-44 rounded-full opacity-60 blur-2xl" style={{ background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)" }} aria-hidden />
      <p className="relative text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70">{t("xp.yourLevel", { language })}</p>

      <div className="relative mt-3 flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-end gap-3">
          <div dir="ltr"><DotNumber value={s.level} cell={8} color="#67E8F9" glow={false} field fieldColor="rgba(255,255,255,.07)" label={s.level} /></div>
          <p className="min-w-0 pb-1 text-[15px] font-semibold leading-tight">{t(`levelname.${s.level}`)}</p>
        </div>
        <p className="tabular shrink-0 whitespace-nowrap pb-1 text-end text-[12.5px] font-semibold text-white/80">{t("xp.total", { xp: n(s.xp) })}</p>
      </div>

      <div className="relative mt-5">
        <div className="h-3 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label={t("xp.barLabel")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.fraction * 100)}>
          <div className="level-fill h-full rounded-full" style={{ width: `${Math.max(s.fraction > 0 ? 3 : 0, s.fraction * 100)}%`, background: "linear-gradient(90deg, #A5F3FC, #22D3EE)" }} />
        </div>
        {s.next ? (
          <div className="tabular mt-2 flex items-baseline justify-between gap-3 text-[13px] font-semibold">
            <span className="text-white/75">{t("xp.progress", { into: n(s.into), span: n(s.span) })}</span>
            <span>{t("xp.toGo", { xp: n(s.toGo), next: s.next })}</span>
          </div>
        ) : (
          <p className="mt-2 text-[13px] font-semibold">{t("xp.top")}</p>
        )}
      </div>

      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
              className="relative mt-3 flex h-11 w-full items-center justify-between gap-2 rounded-xl text-[13px] font-semibold text-white/85 active:opacity-70">
        <span>{t("xp.how")}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <ul className="relative mt-1 space-y-2 border-t border-white/15 pt-3 text-[13px] leading-snug text-white/90">
          <li>{t("xp.howPage", { xp: XP.page, half: XP.pageBelow })}</li>
          <li>{t("xp.howFinish", { xp: XP.finishPerPage })}</li>
          <li>{t("xp.howDaily", { xp: XP.firstOfDay })}</li>
          <li className="text-white/65">{t("xp.howSoon")}</li>
        </ul>
      )}
    </section>
  );
}

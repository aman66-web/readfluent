"use client";

import { useEffect } from "react";
import { BADGES, markBadgesSeen } from "@/lib/badges";
import { useT } from "@/lib/i18n/react";
import { BadgeIcon } from "./Icon";
import { useBadges } from "./useBadges";

/** Every achievement: the ones earned lit, the rest waiting. Looking at them is what makes them no longer new. */
export function BadgeGrid() {
  const t = useT();
  const { earned } = useBadges();
  const n = Object.keys(earned).length;
  useEffect(() => { markBadgesSeen(); }, []);
  return (
    <section className="mt-6" aria-label={t("badges.title")}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-faint">{t("badges.title")}</h2>
        <p className="tabular text-[12.5px] font-semibold text-accent">{t("badges.unlocked", { n, total: BADGES.length })}</p>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-2.5">
        {BADGES.map((b) => {
          const on = b.id in earned;
          return (
            <li key={b.id} data-badge={b.id} data-earned={on || undefined} className={`flex items-start gap-3 rounded-[20px] border p-3 ${on ? "border-accent-bright/50 bg-accent-bright/10" : "border-border bg-surface opacity-60"}`}>
              <span className={`grid size-10 shrink-0 place-items-center rounded-full ${on ? "btn-cyan" : "bg-border/60 text-muted"}`}><BadgeIcon id={b.id} className="size-5" /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold leading-tight">{t(`badge.${b.id}` as "badge.firstPage")}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-muted">{t(`badge.${b.id}.d` as "badge.firstPage.d")}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import Link from "next/link";
import { Mascot } from "@/components/mascot/Mascot";
import { markBadgesSeen, unseen } from "@/lib/badges";
import { useT } from "@/lib/i18n/react";
import { BadgeIcon } from "./Icon";
import { useBadges } from "./useBadges";

/**
 * On the home screen: a reader who has earned something since they last looked is told, once, with
 * Dewey cheering. It also keeps the badges up to date as they are reached (see useBadges).
 */
export function NewBadge() {
  const t = useT();
  const state = useBadges();
  const fresh = unseen(state);
  if (fresh.length === 0) return null;
  const id = fresh[0];
  return (
    <section role="status" className="mt-3 flex items-center gap-3 rounded-[22px] bg-accent-bright p-3.5 text-on-cyan">
      <span className="block w-14 shrink-0"><Mascot mood="cheer" className="w-full" /></span>
      <Link href="/me" onClick={() => markBadgesSeen()} className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-bold uppercase tracking-[0.1em] text-on-cyan/70">{t("badges.new")}{fresh.length > 1 ? ` +${fresh.length - 1}` : ""}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[17px] font-bold leading-tight">
          <BadgeIcon id={id} className="size-5 shrink-0" />
          <span className="truncate">{t(`badge.${id}` as "badge.firstPage")}</span>
        </span>
      </Link>
      <button type="button" onClick={() => markBadgesSeen()} aria-label={t("ui.close")} className="grid size-10 shrink-0 place-items-center rounded-full text-on-cyan/80 active:bg-on-cyan/10">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </section>
  );
}

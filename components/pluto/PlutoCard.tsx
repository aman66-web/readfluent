"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { useLocale, useT } from "@/lib/i18n/react";
import { Coin } from "./Coin";
import { useWallet } from "./useWallet";

const noSubscribe = () => () => {};

/**
 * Pluto at the top of the home screen (owner, 4 Oct 2026): wearing what the reader has bought, with their coins, what this
 * visit earned (XP, level-ups, a finished leaderboard) and the way into the wardrobe.
 */
export function PlutoCard() {
  const t = useT();
  const locale = useLocale();
  const client = useSyncExternalStore(noSubscribe, () => true, () => false);
  const { coins, gains } = useWallet();
  const prize = gains.prizes[0];
  return (
    <Link href="/pluto" data-pluto-card className="relative flex items-center gap-3 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#E6FAFE] via-[#C9F3FB] to-[#9EE8F7] p-4 pe-5 shadow-[0_18px_30px_-22px_rgba(8,47,60,.6)] active:opacity-90">
      <span aria-hidden className="pointer-events-none absolute -end-8 -top-10 size-40 rounded-full bg-white/40" />
      <span className="relative block w-[112px] shrink-0"><Mascot mood={gains.xp > 0 || prize ? "cheer" : "hello"} className="w-full" /></span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ob-deep)]">{t("pluto.title")}</span>
        <span className="tabular mt-1 flex items-center gap-1.5 text-[26px] font-extrabold leading-none tracking-[-0.02em] text-[#0B1B22]">
          <Coin className="size-6" />{client ? coins.toLocaleString(locale) : "…"}
        </span>
        {prize ? (
          <span className="mt-1.5 block text-[13px] font-semibold leading-snug text-[#0B1B22]">{t(prize.kind === "week" ? "pluto.prizeWeek" : "pluto.prizeMonth", { rank: prize.rank, n: prize.coins })}</span>
        ) : gains.xp > 0 ? (
          <span className="mt-1.5 block text-[13px] font-semibold leading-snug text-[#0B1B22]">{t("pluto.gainedXp", { n: gains.xp })}</span>
        ) : (
          <span className="mt-1.5 block text-[13px] leading-snug text-[#0B1B22]/70">{t("pluto.sub")}</span>
        )}
        <span className="btn-cyan mt-3 inline-flex h-10 items-center rounded-full px-4 text-[14px] font-bold">{t("pluto.customise")}</span>
      </span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/react";

export function RecallView() {
  const t = useT();
  return (
    <main className="safe-top px-5 pb-32 pt-6">
      <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("recall.title")}</h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">{t("recall.sub")}</p>

      <div className="mt-8 rounded-[26px] border border-border bg-surface px-6 py-10 text-center">
        {/* Two cards, one lifting off the other, in the app's cyan. */}
        <svg viewBox="0 0 120 90" className="mx-auto h-[88px] w-auto" aria-hidden>
          <rect x="22" y="30" width="62" height="48" rx="9" fill="#CFF7FC" />
          <rect x="34" y="14" width="62" height="48" rx="9" fill="#0E7490" transform="rotate(-6 65 38)" />
          <g stroke="#E6FBFF" strokeWidth="4" strokeLinecap="round" transform="rotate(-6 65 38)"><path d="M46 30h30M46 42h18" /></g>
          <path className="gb-spark" d="M96 14 q0 6 6 6 q-6 0 -6 6 q0 -6 -6 -6 q6 0 6 -6z" fill="#22D3EE" />
        </svg>
        <p className="mt-5 text-[15px] leading-snug text-muted">{t("recall.empty")}</p>
        <span className="mt-5 inline-flex h-8 items-center rounded-full bg-accent-bright/25 px-3.5 text-[12px] font-bold text-accent">{t("recall.soon")}</span>
      </div>

      <Link href="/library" className="mt-4 flex h-14 items-center justify-center rounded-full bg-foreground text-[16px] font-semibold text-background active:opacity-85">
        {t("home.browse")}
      </Link>
    </main>
  );
}

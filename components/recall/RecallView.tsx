"use client";

import Link from "next/link";
import { Lex } from "@/components/mascot/Lex";
import { useT } from "@/lib/i18n/react";

export function RecallView() {
  const t = useT();
  return (
    <main className="safe-top px-5 pb-32 pt-6">
      <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("recall.title")}</h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">{t("recall.sub")}</p>

      <div className="mt-8 rounded-[26px] border border-border bg-surface px-6 py-10 text-center">
        {/* Lex dozing off: nothing to review yet. */}
        <Lex mood="sleepy" className="mx-auto block h-[150px] w-auto" />
        <p className="mt-5 text-[15px] leading-snug text-muted">{t("recall.empty")}</p>
        <span className="mt-5 inline-flex h-8 items-center rounded-full bg-accent-bright/25 px-3.5 text-[12px] font-bold text-accent">{t("recall.soon")}</span>
      </div>

      <Link href="/library" className="mt-4 flex h-14 items-center justify-center rounded-full bg-foreground text-[16px] font-semibold text-background active:opacity-85">
        {t("home.browse")}
      </Link>
    </main>
  );
}

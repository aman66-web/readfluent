"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/react";

export function OfflineView() {
  const t = useT();
  return (
    <main className="safe-top flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[22px] font-semibold">{t("offline.title")}</h1>
      <p className="mt-2 max-w-[28ch] text-[15px] leading-snug text-muted">{t("offline.body")}</p>
      <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-foreground px-6 text-[14px] font-semibold text-background">
        {t("offline.back")}
      </Link>
    </main>
  );
}

"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { useT } from "@/lib/i18n/react";

export function PrivacyView() {
  const t = useT();
  return (
    <main className="safe-top safe-bottom px-6 pb-12 pt-8">
      <Link href="/welcome" className="inline-flex items-center gap-1 text-[14px] font-semibold text-muted"><span aria-hidden className="rtl:-scale-x-100">←</span>{t("ui.back")}</Link>
      <h1 className="mt-6 text-[26px] font-bold tracking-[-0.015em]">{t("privacy.title")}</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">{t("privacy.p1", { app: APP_NAME })}</p>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">{t("privacy.p2")}</p>
    </main>
  );
}

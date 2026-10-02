"use client";

import { BackLink } from "@/components/BackLink";
import { APP_NAME } from "@/lib/brand";
import { useT } from "@/lib/i18n/react";

export function PrivacyView() {
  const t = useT();
  return (
    <main className="safe-top safe-bottom px-6 [--pb:3rem] [--pt:2rem]">
      <BackLink fallback="/me" previous className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-muted"><span aria-hidden className="rtl:-scale-x-100">←</span>{t("ui.back")}</BackLink>
      <h1 className="mt-6 text-[26px] font-bold tracking-[-0.015em]">{t("privacy.title")}</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">{t("privacy.p1", { app: APP_NAME })}</p>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">{t("privacy.p2")}</p>
    </main>
  );
}

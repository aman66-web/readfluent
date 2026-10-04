"use client";

import { BackLink } from "@/components/BackLink";
import { LanguagePicker } from "@/components/onboarding/Tongues";
import { useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";

export function LanguagesView() {
  const t = useT();
  const a = useAnswers();
  return (
    <main className="ob safe-top min-h-dvh px-5 pb-32 [--pt:.5rem]">
      <BackLink fallback="/" previous label={t("ui.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </BackLink>
      <h1 className="mt-3 text-[28px] font-bold tracking-[-0.02em]">{t("languages.title")}</h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">{t("languages.sub")}</p>
      <div className="mt-6">
        <LanguagePicker speak={a.language} learn={a.learn} loader />
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";

/** The library's top: the name, the line under it, and the way to the Languages page. */
export function LibraryHeader() {
  const t = useT();
  const locale = useLocale();
  const { learn } = useAnswers();
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[30px] font-bold tracking-[-0.02em]">{APP_NAME}</h1>
        <p className="font-reading mt-0.5 text-[17px] text-muted">{t("first.tagline1")} {t("first.tagline2")}</p>
      </div>
      <Link href="/languages" className="mt-1.5 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[13px] font-semibold text-muted active:opacity-80">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
        </svg>
        <span>{learn ? languageName(learn, locale) : t("languages.link")}</span>
      </Link>
    </header>
  );
}

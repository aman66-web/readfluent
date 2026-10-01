"use client";

import { APP_NAME } from "@/lib/brand";
import { useT } from "@/lib/i18n/react";
import { ProfileButton } from "@/components/home/ProfileButton";

/** Home's top: the name, the line under it, and the profile button on the right. */
export function LibraryHeader() {
  const t = useT();
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[30px] font-bold tracking-[-0.02em]">{APP_NAME}</h1>
        <p className="font-reading mt-0.5 text-[17px] text-muted">{t("first.tagline1")} {t("first.tagline2")}</p>
      </div>
      <ProfileButton />
    </header>
  );
}

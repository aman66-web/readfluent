"use client";

import { BackLink } from "@/components/BackLink";
import { onNativeShell } from "@/lib/auth/shell";
import { APP_NAME } from "@/lib/brand";
import { useT } from "@/lib/i18n/react";
import { previousPath } from "@/lib/nav";
import { useOnDevice } from "@/lib/store/device";

/** Whether this page has an in-app way back: it was reached from another page of the app, or it is inside the app, which has no browser Back of its own. */
export const hasWayBack = (): boolean => onNativeShell() || previousPath() !== null;

/**
 * The way back from a legal page, in the reader's language: to wherever they came from (Profile, the first run), else
 * Profile. Shown only where there is an in-app way back. Not in the browser sheet the subscription screen opens these
 * pages in (components/OverLink.tsx: Safari's on the iPhone, signed out there, so Profile would only ask them to sign in;
 * the sheet's own Done goes back), and not to a visitor from a store listing or a link (the browser has its own Back).
 */
export function LegalBack() {
  const t = useT();
  if (!useOnDevice(hasWayBack, false)) return null;
  return (
    <BackLink fallback="/me" previous className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-muted"><span aria-hidden className="rtl:-scale-x-100">←</span>{t("ui.back")}</BackLink>
  );
}

export function PrivacyView() {
  const t = useT();
  return (
    <main className="safe-top safe-bottom px-6 [--pb:3rem] [--pt:2rem]">
      <LegalBack />
      <h1 className="mt-6 text-[26px] font-bold tracking-[-0.015em]">{t("privacy.title")}</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">{t("privacy.p1", { app: APP_NAME })}</p>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">{t("privacy.p2")}</p>
    </main>
  );
}

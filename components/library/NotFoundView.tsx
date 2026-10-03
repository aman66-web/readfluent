"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/react";

export function NotFoundView() {
  const t = useT();
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center px-8 text-center [--pb:2rem] [--pt:2rem]">
      <p aria-hidden className="tabular text-[64px] font-extrabold leading-none text-accent">404</p>
      <h1 className="title-display mt-4">{t("notFound.title")}</h1>
      <p className="mt-3 max-w-[300px] text-[15px] leading-snug text-muted">{t("notFound.body")}</p>
      <Link href="/library" className="btn-cyan mt-8 inline-flex h-12 items-center rounded-full px-7 text-[16px] font-bold">{t("notFound.library")}</Link>
    </main>
  );
}

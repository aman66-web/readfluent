"use client";

import { Library } from "@/components/library/Library";
import { useT } from "@/lib/i18n/react";
import { PREVIEW_BOOKS } from "@/lib/preview/catalog";

export function LibraryView() {
  const t = useT();
  return (
    <main className="safe-top px-5 pb-32 [--pt:1.5rem]">
      <h1 className="title-display">{t("tab.library")}</h1>
      <div className="mt-5"><Library books={PREVIEW_BOOKS} /></div>
    </main>
  );
}

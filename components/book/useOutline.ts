"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/react";
import { loadOutline } from "@/lib/preview/outline";
import type { OutlineItem } from "./Pathway";

/** The book's moments in the reader's language where there is a translation of the same length, else as sent (English). */
export function useOutline(slug: string, english: readonly OutlineItem[]): readonly OutlineItem[] {
  const locale = useLocale();
  const [loaded, setLoaded] = useState<{ key: string; lines: string[] } | null>(null);
  const key = `${slug}:${locale}`;
  useEffect(() => {
    if (locale === "en") return;
    let live = true;
    void loadOutline(slug, locale).then((lines) => { if (live && lines) setLoaded({ key, lines }); });
    return () => { live = false; };
  }, [slug, locale, key]);
  if (locale === "en" || loaded?.key !== key || loaded.lines.length !== english.length) return english;
  return english.map((item, i) => ({ n: item.n, text: loaded.lines[i], lang: locale }));
}

"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/react";
import { loadOutline } from "@/lib/preview/outline";
import { deviceStatus, deviceTranslate } from "@/lib/translate/device";
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
  // No ready-made translation of the same length: the phone's own translator, if it already has the language (it never
  // starts a download from here). The lines are short, so the whole outline is one quick pass.
  const [byPhone, setByPhone] = useState<{ key: string; lines: string[] } | null>(null);
  const needPhone = locale !== "en" && english.length > 0 && byPhone?.key !== key && !(loaded?.key === key && loaded.lines.length === english.length);
  useEffect(() => {
    if (!needPhone) return;
    let live = true;
    void (async () => {
      try {
        if ((await deviceStatus("en", locale)) !== "ready") return;
        const lines = await deviceTranslate(english.map((i) => i.text), "en", locale);
        if (live && lines.length === english.length) setByPhone({ key, lines });
      } catch { /* the English stays */ }
    })();
    return () => { live = false; };
  }, [needPhone, english, locale, key]);
  if (locale === "en") return english;
  if (loaded?.key === key && loaded.lines.length === english.length) return english.map((item, i) => ({ n: item.n, text: loaded.lines[i], lang: locale }));
  if (byPhone?.key === key) return english.map((item, i) => ({ n: item.n, text: byPhone.lines[i], lang: locale }));
  return english;
}

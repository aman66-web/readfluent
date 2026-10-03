"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReaderVariant } from "@/components/reader/types";
import { LEVELS } from "@/lib/content/limits";
import { devicePrepare, deviceStatus, deviceTranslate } from "@/lib/translate/device";
import { translatePages, wordCards } from "@/lib/translate/variant";

/**
 * The book in the language being learned, when the book has no hand-made translation into it.
 *
 * First choice: the phone translates it itself (lib/translate/device.ts), free and offline. The pages come
 * first so the book opens quickly; the word cards follow a moment later. If the phone needs to fetch the
 * language once, the state is "download" and `download()` (called from a tap) asks the phone to fetch it.
 * Without a device translator, the server's translator is asked (app/api/translate), which says "off" when
 * it is not switched on.
 */
export type TranslatedState = "idle" | "loading" | "download" | "ready" | "off" | "failed";

interface Result { key: string; state: Exclude<TranslatedState, "idle" | "loading">; variant: ReaderVariant | null }

const done = new Map<string, ReaderVariant>();

export function useTranslated(lang: string | null, speak: string, slug: string, levelId: string, length: number, english: readonly string[] | null): {
  state: TranslatedState; variant: ReaderVariant | null; download: () => void;
} {
  const levelSlug = LEVELS.find((l) => l.id === levelId)?.slug ?? "";
  const key = lang ? `${slug}/${levelSlug}/${length}/${lang}/${speak}` : null;
  const [res, setRes] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key || !lang) return;
    let live = true;
    const settle = (r: Omit<Result, "key">) => { if (live) setRes({ key, ...r }); };
    (async () => {
      const cached = done.get(key);
      if (cached) return settle({ state: "ready", variant: cached });
      // 1. The phone's own translator.
      if (english && english.length) {
        const status = await deviceStatus("en", lang);
        if (status === "download" && attempt === 0) return settle({ state: "download", variant: null });
        if (status === "ready" || (status === "download" && attempt > 0)) {
          try {
            const pages = await translatePages(english, lang, deviceTranslate);
            settle({ state: "ready", variant: pages });
            // The word cards, in the reader's own language (or English if the phone cannot do that pair).
            let dict = {};
            try { dict = await wordCards(pages, speak || "en", deviceTranslate); }
            catch { try { dict = await wordCards(pages, "en", deviceTranslate); } catch { /* the cards stay empty */ } }
            const full = { ...pages, dict };
            done.set(key, full);
            return settle({ state: "ready", variant: full });
          } catch { /* fall through to the server */ }
        }
      }
      // 2. The server's translator, if it is switched on.
      const q = new URLSearchParams({ slug, level: levelSlug, length: String(length), lang, speak: speak || "en" });
      try {
        const r = await fetch(`/api/translate?${q}`);
        if (r.status === 503) return settle({ state: "off", variant: null });
        if (!r.ok) return settle({ state: "failed", variant: null });
        const body = (await r.json()) as { variant?: ReaderVariant };
        if (!body.variant) return settle({ state: "failed", variant: null });
        done.set(key, body.variant);
        return settle({ state: "ready", variant: body.variant });
      } catch {
        return settle({ state: "failed", variant: null });
      }
    })();
    return () => { live = false; };
  }, [key, lang, speak, slug, levelSlug, length, english, attempt]);

  const download = useCallback(() => {
    if (!lang) return;
    setRes(null);
    void devicePrepare("en", lang).finally(() => setAttempt((a) => a + 1));
  }, [lang]);

  if (!key) return { state: "idle", variant: null, download };
  if (!res || res.key !== key) return { state: "loading", variant: null, download };
  return { state: res.state, variant: res.variant, download };
}

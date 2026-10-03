"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReaderPage, ReaderVariant } from "@/components/reader/types";
import type { KeyPair, WordEntry } from "@/lib/preview/spanish";
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
export type TranslatedState = "idle" | "loading" | "download" | "ready" | "partial" | "off" | "failed";

/** The first chapter translated ahead of time (app/api/book-start), if the book has one in this language. */
async function fetchStart(slug: string, level: string, lang: string): Promise<{ pages: { text: string; keys: KeyPair[] }[]; dict: Record<string, WordEntry> } | null> {
  try {
    const r = await fetch(`/api/book-start?${new URLSearchParams({ slug, level, lang })}`);
    if (!r.ok) return null;
    const b = (await r.json()) as { pages?: { text: string; keys: KeyPair[] }[]; dict?: Record<string, WordEntry> };
    return b.pages?.length ? { pages: b.pages, dict: b.dict ?? {} } : null;
  } catch { return null; }
}

/** The first chapter's pages, in the reader's shape, matched to the English ones. */
function startPages(start: { pages: { text: string; keys: KeyPair[] }[] }, english: readonly string[]): ReaderPage[] {
  return start.pages.slice(0, english.length).map((p, i) => ({ n: i + 1, text: p.text, scene: i + 1, target: { translation: english[i], keys: p.keys ?? [] } }));
}

/** The first chapter in the language and the rest in English: what a device without a translator can show. */
function mixed(lang: string, head: ReaderPage[], english: readonly string[], dict: Record<string, WordEntry>): ReaderVariant {
  return {
    lang: lang as ReaderVariant["lang"],
    dict,
    pages: [...head, ...english.slice(head.length).map((text, i) => ({ n: head.length + i + 1, text, scene: head.length + i + 1 }))],
  };
}

/** A device translator that never answers (a download that stalls, a browser that waits for a tap) must not hold the book. */
function within<T>(ms: number, work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), ms);
    work.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}
const PAGES_MS = 120_000;
const PREPARE_MS = 180_000;

interface Result { key: string; state: Exclude<TranslatedState, "idle" | "loading">; variant: ReaderVariant | null }

const done = new Map<string, ReaderVariant>();
/** The server said its translator is off: not asked again until the page is reloaded. */
let serverOff = false;

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
      // The first chapter, translated ahead of time, where the book has one.
      const start = english && english.length ? await fetchStart(slug, levelSlug, lang) : null;
      const head = start && english ? startPages(start, english) : [];
      // 1. The phone's own translator, for the rest of the book.
      if (english && english.length) {
        const status = await deviceStatus("en", lang);
        // The download screen; where chapter 1 is ready, it is offered meanwhile (the variant is the mixed book).
        if (status === "download" && attempt === 0) return settle({ state: "download", variant: start ? mixed(lang, head, english, start.dict) : null });
        if (status === "ready" || (status === "download" && attempt > 0)) {
          try {
            const rest = await within(PAGES_MS, translatePages(english.slice(head.length), lang, deviceTranslate));
            const pages: ReaderVariant = {
              lang: rest.lang,
              dict: {},
              pages: [...head, ...rest.pages.map((p, i) => ({ ...p, n: head.length + i + 1, scene: head.length + i + 1, target: { translation: english[head.length + i], keys: [] } }))],
            };
            settle({ state: "ready", variant: { ...pages, dict: speak === "en" || !speak ? { ...(start?.dict ?? {}) } : {} } });
            // The word cards, in the reader's own language (or English if the phone cannot do that pair). The
            // first chapter's hand-made cards are kept for an English speaker; they explain more than one word can.
            let dict: Record<string, WordEntry> = {};
            try { dict = await wordCards(pages, speak || "en", deviceTranslate); }
            catch { try { dict = await wordCards(pages, "en", deviceTranslate); } catch { /* the cards stay empty */ } }
            if ((speak === "en" || !speak) && start) dict = { ...dict, ...start.dict };
            const full = { ...pages, dict };
            done.set(key, full);
            return settle({ state: "ready", variant: full });
          } catch { /* fall through */ }
        }
      }
      // 2. No translator on this device: the first chapter in the language, the rest in English.
      if (start && english) return settle({ state: "partial", variant: mixed(lang, head, english, start.dict) });
      // 3. The server's translator, if it is switched on.
      if (serverOff) return settle({ state: "off", variant: null });
      const q = new URLSearchParams({ slug, level: levelSlug, length: String(length), lang, speak: speak || "en" });
      try {
        const r = await fetch(`/api/translate?${q}`);
        if (r.status === 503) { serverOff = true; return settle({ state: "off", variant: null }); }
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
    void within(PREPARE_MS, devicePrepare("en", lang)).catch(() => false).finally(() => setAttempt((a) => a + 1));
  }, [lang]);

  if (!key) return { state: "idle", variant: null, download };
  if (!res || res.key !== key) return { state: "loading", variant: null, download };
  return { state: res.state, variant: res.variant, download };
}

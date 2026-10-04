"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { storageKey } from "@/lib/brand";
import { hasRoman, romaniserFor, type Romaniser } from "@/lib/romanise";
import { readRaw, subscribeTo, writeRaw } from "@/lib/store/local";

const KEY = storageKey("roman");
const subscribe = subscribeTo(KEY);
const server = () => "";

/**
 * Whether the reader wants a language shown in Latin letters (Hindi, Bengali, Chinese, Urdu, Arabic: lib/romanise), kept per
 * language on the device, and the function that does it once it is ready (Chinese loads its dictionary the first time).
 */
export function useRoman(lang: string): { available: boolean; on: boolean; convert: Romaniser | null; toggle: () => boolean } {
  const raw = useSyncExternalStore(subscribe, () => readRaw(KEY), server);
  const available = hasRoman(lang);
  let map: Record<string, boolean> = {};
  try { const v = JSON.parse(raw || "{}"); if (v && typeof v === "object") map = v; } catch { /* as if unset */ }
  const on = available && map[lang] === true;
  const [made, setMade] = useState<{ lang: string; fn: Romaniser } | null>(null);
  useEffect(() => {
    if (!on) return;
    let live = true;
    void romaniserFor(lang).then((fn) => { if (live && fn) setMade({ lang, fn }); });
    return () => { live = false; };
  }, [on, lang]);
  const toggle = useCallback(() => {
    writeRaw(KEY, JSON.stringify({ ...map, [lang]: !on }));
    return !on;
    // `map` and `on` come from `raw`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, lang, on]);
  return { available, on, convert: on && made?.lang === lang ? made.fn : null, toggle };
}

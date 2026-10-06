"use client";

import { useEffect, useState } from "react";
import { hasRoman, romaniserFor, romanText, type Romaniser } from "@/lib/romanise";

/**
 * How the tapped word is said, in Latin letters, for the word card (owner, 6 Oct 2026): for the languages written in another script
 * (Hindi, Bengali, Chinese, Urdu, Arabic) whether or not the page itself is shown in Latin letters. Null for every other language, or
 * while the converter loads (Chinese loads its dictionary the first time).
 */
export function useCardReading(lang: string, word: string | null): string | null {
  const [made, setMade] = useState<{ lang: string; fn: Romaniser } | null>(null);
  const want = hasRoman(lang);
  useEffect(() => {
    if (!want || !word) return;
    let live = true;
    void romaniserFor(lang).then((fn) => { if (live && fn) setMade({ lang, fn }); });
    return () => { live = false; };
  }, [lang, want, word]);
  if (!want || !word || made?.lang !== lang) return null;
  const out = romanText(word, made.fn).trim();
  return out && out.toLowerCase() !== word.toLowerCase() ? out : null;
}

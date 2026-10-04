"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReaderPage } from "@/components/reader/types";
import { holdBackground } from "@/lib/translate/background";
import { alignPage } from "@/lib/translate/align";

/**
 * The pages with their matched words and phrases filled in, for pages the phone translated (lib/translate/align.ts):
 * the page in front of the reader and the next one are matched when they come up, a moment after the text is there.
 * Pages that came with their own matches are left as they are.
 */
export function usePageKeys(pages: ReaderPage[], index: number, lang: string): ReaderPage[] {
  const [found, setFound] = useState<Record<number, { text: string; keys: { w: string; en: string }[] }>>({});
  useEffect(() => {
    let live = true;
    (async () => {
      for (const i of [index, index + 1]) {
        const p = pages[i];
        if (!p?.target || p.target.keys.length > 0 || found[i]?.text === p.text) continue;
        holdBackground(true);
        let keys: { w: string; en: string }[] = [];
        try { keys = await alignPage(p.target.translation, p.text, lang); } finally { holdBackground(false); }
        if (!live) return;
        setFound((f) => ({ ...f, [i]: { text: p.text, keys } }));
      }
    })();
    return () => { live = false; };
    // `found` is read only to skip work already done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, index, lang]);
  return useMemo(() => pages.map((p, i) => {
    const f = found[i];
    return f && f.text === p.text && f.keys.length && p.target ? { ...p, target: { ...p.target, keys: f.keys } } : p;
  }), [pages, found]);
}

/**
 * The quick check that is offered after every five pages (owner, 4 Oct 2026): a few questions about the pages just read, as many as
 * the reader asked for. Made from the pages' own sentences, their English lines and matched words; no model. Pure and seeded.
 */
import { sentenceRanges } from "@/lib/reading/sentences";
import { gap, meaning, rng, shuffle, vocab, type Item } from "@/lib/tests/build";
import type { Question } from "@/lib/tests/types";

/** Pages in a block: a check is offered each time the reader finishes one. */
export const BLOCK = 5;
/** What the reader can pick to be asked; 0 (off) and "ask me" live in the preferences. */
export const CHECK_COUNTS = [3, 5, 10] as const;
export type CheckCount = (typeof CHECK_COUNTS)[number];
export const isCheckCount = (v: unknown): v is CheckCount => (CHECK_COUNTS as readonly unknown[]).includes(v);

/** A page as the quiz sees it. */
export interface QuizPage { text: string; translation?: string; keys?: { w: string; en: string }[] }

const sentencesOf = (s: string): string[] => sentenceRanges(s).map(([a, b]) => s.slice(a, b).trim()).filter(Boolean);
const usable = (w: string, en: string): boolean => [...w.replace(/\s/g, "")].length >= 4 && en.replace(/[^\p{L}]/gu, "").length >= 4;

/** A page's sentences with their English where the two have the same number of sentences (else the page as one), and the matched words of each. */
export function pageItems(pages: readonly QuizPage[]): Item[] {
  const out: Item[] = [];
  for (const p of pages) {
    const ts = sentencesOf(p.text);
    const es = p.translation ? sentencesOf(p.translation) : [];
    const pairs: [string, string | undefined][] = es.length === ts.length ? ts.map((t, i) => [t, es[i]]) : [[p.text.trim(), p.translation?.trim() || undefined]];
    for (const [t, e] of pairs) {
      const lower = t.toLowerCase();
      const k = (p.keys ?? []).filter((x) => usable(x.w, x.en) && lower.includes(x.w.toLowerCase())).map((x): [string, string] => [x.w, x.en]);
      out.push({ b: 0, t, ...(e ? { e } : {}), ...(k.length ? { k } : {}) });
    }
  }
  return out;
}

const ORDER = ["meaning", "gap", "vocab"] as const;

/**
 * Up to `count` questions about `asked` (the last pages' items), with wrong answers drawn from `pool` (everything read so far).
 * Fewer come back when the pages cannot make that many; none when they cannot make any.
 */
export function miniQuestions(args: { lang: string; asked: readonly Item[]; pool: readonly Item[]; count: number; seed: number }): Question[] {
  const { lang, asked, pool, count, seed } = args;
  const r = rng(seed);
  const sentences = shuffle(asked.filter((i) => i.t.trim().length >= 6), r);
  const pairs = [...new Map(asked.flatMap((i) => i.k ?? []).map((p) => [p[0].toLowerCase(), p])).values()];
  const vOrder = shuffle(pairs.map((_, i) => i), r);
  const out: Question[] = [];
  const used = new Set<string>();
  let kind = 0;
  let v = 0;
  for (let tries = 0; out.length < count && tries < count * 8; tries++) {
    const k = ORDER[kind++ % ORDER.length];
    let q: Question | null = null;
    if (k === "vocab") {
      while (!q && v < vOrder.length) { q = pairs.length >= 4 ? vocab(pairs, lang, r, `m-v${v}`, vOrder[v]) : null; v++; }
    } else {
      for (let s = 0; !q && s < sentences.length; s++) {
        const key = `${s}:${k}`;
        if (used.has(key)) continue;
        used.add(key);
        q = k === "meaning" ? meaning(sentences[s], pool, lang, r, `m-m${s}`, "meaning") : gap(sentences[s], pool, lang, r, `m-g${s}`);
      }
    }
    if (q) out.push(q);
  }
  return out;
}

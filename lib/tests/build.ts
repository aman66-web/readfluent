/**
 * Makes a paper of questions from a bank of sentences. Pure and seeded: the same seed gives the same paper, a new
 * seed a new one. Nothing here knows about files or the network (the route, app/api/tests, brings the bank).
 */
import { tokenize } from "@/lib/reading/sentences";
import { BAND_OF, CEFR, type Band, type Cefr } from "@/lib/xp/levels";
import { PAPER_SIZE, type Paper, type Question, type QuestionKind, type TestKind } from "./types";

/** One sentence of the bank: `b` band 0–2, `t` the sentence, `e` its English, `k` matched [word, English] pairs. */
export interface Item { b: number; t: string; e?: string; k?: [string, string][] }
/** A phrase of a phrase deck. */
export interface Phrase { t: string; en: string }

const BAND_NUM: Record<Band, number> = { A1A2: 0, B1B2: 1, C1C2: 2 };

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = <T,>(xs: readonly T[], r: () => number): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const pick = <T,>(xs: readonly T[], n: number, r: () => number): T[] => shuffle(xs, r).slice(0, n);
const wordsOf = (t: string): string[] => tokenize(t).flatMap((x) => (x.word ? [x.text] : []));

/** The sentences for a level: its band, and within the band the easier half (first level of the band) or the harder half (second). */
export function itemsFor(items: readonly Item[], level: Cefr): Item[] {
  const band = BAND_NUM[BAND_OF[level]];
  const inBand = items.filter((i) => i.b === band).sort((a, b) => wordsOf(a.t).length - wordsOf(b.t).length);
  if (inBand.length < 20) return inBand;
  const second = CEFR.indexOf(level) % 2 === 1;
  const mid = Math.floor(inBand.length / 2);
  return second ? inBand.slice(mid - Math.floor(inBand.length / 6)) : inBand.slice(0, mid + Math.floor(inBand.length / 6));
}

const letters = (w: string) => [...w].length;

/** A sentence with one word taken out, and four words to put back; null if there is no good word to take. */
function gap(item: Item, pool: readonly Item[], lang: string, r: () => number, id: string): Question | null {
  const toks = tokenize(item.t);
  const idx = toks.map((t, i) => (t.word && i > 0 && letters(t.word) >= 4 && t.text[0] === t.text[0].toLowerCase() ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return null;
  const at = idx[Math.floor(r() * idx.length)];
  const right = toks[at].text;
  const near = shuffle(pool.flatMap((p) => wordsOf(p.t)), r).filter((w) => w !== right && w.toLowerCase() !== right.toLowerCase() && w[0] === w[0].toLowerCase() && Math.abs(letters(w) - letters(right)) <= 2);
  const wrong = [...new Set(near.map((w) => w.toLowerCase()))].slice(0, 3);
  if (wrong.length < 3) return null;
  const options = shuffle([right, ...wrong], r);
  const prompt = toks.map((t, i) => (i === at ? "____" : t.text)).join("");
  return { id, kind: "gap", lang, prompt, options, answer: options.indexOf(right), reveal: { text: item.t, en: item.e } };
}

/** What does this sentence say: four English sentences. Needs the item's English. */
function meaning(item: Item, pool: readonly Item[], lang: string, r: () => number, id: string, kind: "meaning" | "listen"): Question | null {
  if (!item.e) return null;
  const near = shuffle(pool.filter((p) => p.e && p.e !== item.e), r);
  const len = item.e.length;
  const wrong = near.sort((a, b) => Math.abs((a.e as string).length - len) - Math.abs((b.e as string).length - len)).slice(0, 8);
  const three = pick(wrong, 3, r).map((p) => p.e as string);
  if (three.length < 3) return null;
  const options = shuffle([item.e, ...three], r);
  return { id, kind, lang, prompt: kind === "listen" ? "" : item.t, say: kind === "listen" ? item.t : undefined, options, answer: options.indexOf(item.e), reveal: { text: item.t, en: item.e } };
}

/** Which of four sentences was it (when there is no translation to ask for). */
function listenSame(item: Item, pool: readonly Item[], lang: string, r: () => number, id: string): Question | null {
  const len = item.t.length;
  const near = shuffle(pool.filter((p) => p.t !== item.t), r).sort((a, b) => Math.abs(a.t.length - len) - Math.abs(b.t.length - len)).slice(0, 8);
  const three = pick(near, 3, r).map((p) => p.t);
  if (three.length < 3) return null;
  const options = shuffle([item.t, ...three], r);
  return { id, kind: "listen", lang, prompt: "", say: item.t, options, answer: options.indexOf(item.t), reveal: { text: item.t, en: item.e } };
}

/** Put the words in order: a whole short sentence, or the opening eight words of a long one. */
function order(item: Item, lang: string, r: () => number, id: string): Question | null {
  const all = wordsOf(item.t);
  if (all.length < 4) return null;
  const solution = all.length > 9 ? all.slice(0, 8) : all;
  let words = shuffle(solution, r);
  for (let i = 0; i < 4 && words.join(" ") === solution.join(" "); i++) words = shuffle(solution, r);
  return { id, kind: "order", lang, prompt: item.e ?? "", words, solution, reveal: { text: item.t, en: item.e } };
}

/** What does this word mean: from the matched words of the bank, or a deck's phrases. */
function vocab(pairs: readonly [string, string][], lang: string, r: () => number, id: string, at: number): Question | null {
  const [w, en] = pairs[at];
  const wrong = [...new Set(shuffle(pairs, r).filter(([x, y]) => x !== w && y !== en).map(([, y]) => y))].slice(0, 3);
  if (wrong.length < 3) return null;
  const options = shuffle([en, ...wrong], r);
  return { id, kind: "vocab", lang, prompt: w, say: w, options, answer: options.indexOf(en), reveal: { text: w, en } };
}

/** Mix of kinds for a mixed paper, in the order they are asked. */
const MIX: readonly QuestionKind[] = ["vocab", "gap", "meaning", "vocab", "listen", "gap", "order", "meaning", "vocab", "listen"];

/**
 * A paper of up to PAPER_SIZE questions. `bank` is the language's sentences; `phrases` is its deck (for languages with no bank).
 * If the bank cannot make enough questions of a kind, the paper is shorter rather than padded with something else.
 */
export function makePaper(args: { lang: string; level: Cefr; kind: TestKind; bank: readonly Item[]; phrases?: readonly Phrase[]; seed: number }): Paper {
  const { lang, level, kind, bank, phrases, seed } = args;
  const r = rng(seed);
  const pool = itemsFor(bank, level);
  const pairs: [string, string][] = [
    ...pool.flatMap((i) => i.k ?? []),
    ...(phrases ? phrases.map((p): [string, string] => [p.t, p.en]) : []),
  ];
  const uniquePairs = [...new Map(pairs.map((p) => [p[0].toLowerCase(), p])).values()];
  const sentences = shuffle(pool, r);
  // Phrases for the early levels: the deck is ordered most useful first, so A1 takes its first half and A2 the rest.
  const deck = phrases ? (CEFR.indexOf(level) === 0 ? phrases.slice(0, 50) : phrases.slice(40)) : [];
  const deckPairs: [string, string][] = deck.map((p) => [p.t, p.en]);
  const vocabPairs = phrases && !pool.length ? deckPairs : uniquePairs;
  // A mixed paper asks only what the bank can: with no translations there is no "meaning", with no matched words no "vocab".
  const canVocab = vocabPairs.length >= 4;
  const canMean = pool.some((i) => i.e);
  const kinds: QuestionKind[] = kind === "mixed"
    ? MIX.map((k, i) => (k === "vocab" && !canVocab) || (k === "meaning" && !canMean) ? (i % 2 ? "order" : "gap") : k)
    : Array.from({ length: PAPER_SIZE }, () => kind);

  const questions: Question[] = [];
  let s = 0;
  let v = 0;
  const vOrder = shuffle(vocabPairs.map((_, i) => i), r);
  const used = new Set<string>();
  for (const k of kinds) {
    if (questions.length >= PAPER_SIZE) break;
    let q: Question | null = null;
    if (k === "vocab") {
      while (!q && v < vOrder.length) { q = vocab(vocabPairs, lang, r, `v${v}`, vOrder[v]); v++; }
    } else {
      for (let tries = 0; !q && tries < 14 && s < sentences.length; tries++, s++) {
        const it = sentences[s];
        if (used.has(it.t)) continue;
        const id = `q${s}`;
        q = k === "gap" ? gap(it, pool, lang, r, id)
          : k === "meaning" ? meaning(it, pool, lang, r, id, "meaning")
          : k === "order" ? order(it, lang, r, id)
          : it.e ? meaning(it, pool, lang, r, id, "listen") : listenSame(it, pool, lang, r, id);
        if (q) used.add(it.t);
      }
    }
    if (q) questions.push(q);
  }
  return { lang, level, kind, questions };
}

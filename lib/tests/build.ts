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

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const shuffle = <T,>(xs: readonly T[], r: () => number): T[] => {
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

/** The sentences an exam draws on: the level's whole band, without its easiest quarter, so it asks harder things than practice does. */
export function examItemsFor(items: readonly Item[], level: Cefr): Item[] {
  const band = BAND_NUM[BAND_OF[level]];
  const inBand = items.filter((i) => i.b === band).sort((a, b) => wordsOf(a.t).length - wordsOf(b.t).length);
  return inBand.slice(Math.floor(inBand.length / 4));
}

const letters = (w: string) => [...w].length;

/** Small closed classes (prepositions, articles, pronouns, conjunctions): when the missing word is one, two of them can both fit, so the wrong answers come from outside the class. */
const CLOSED: Record<string, ReadonlySet<string>> = {
  es: new Set("a ante bajo cabe con contra de desde durante en entre hacia hasta mediante para por según sin sobre tras el la los las un una unos unas lo al del este esta estos estas ese esa esos esas aquel aquella mi tu su sus mis tus nuestro nuestra que como cuando donde pero sino aunque porque pues mientras muy más menos tan tanto todo toda todos todas otro otra otros otras mismo misma ya aún todavía también siempre nunca nada algo alguien nadie cada cual cuyo".split(" ")),
  en: new Set("about above across after against along among around at before behind below beside between beyond by down during for from in inside into near of off on onto out outside over past since through to toward towards under until up upon with within without the a an this that these those my your his her its our their and but or so because although while when where which who whom whose than then very too also just only all each every some any no not both either neither much many more most other such same".split(" ")),
};

/** The distinct lower-case words of a pool, worked out once per pool. */
const wordCache = new WeakMap<readonly Item[], string[]>();
function lowerWords(pool: readonly Item[]): string[] {
  let w = wordCache.get(pool);
  if (!w) { w = [...new Set(pool.flatMap((p) => wordsOf(p.t)).filter((x) => x[0] === x[0].toLowerCase()))]; wordCache.set(pool, w); }
  return w;
}

/** A sentence with one word taken out, and four words to put back; null if there is no good word to take. */
export function gap(item: Item, pool: readonly Item[], lang: string, r: () => number, id: string): Question | null {
  const toks = tokenize(item.t);
  const idx = toks.map((t, i) => (t.word && i > 0 && letters(t.word) >= 4 && t.text[0] === t.text[0].toLowerCase() ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return null;
  const at = idx[Math.floor(r() * idx.length)];
  const right = toks[at].text;
  const closed = CLOSED[lang];
  const inClosed = !!closed?.has(right.toLowerCase());
  const near = shuffle(lowerWords(pool), r).filter((w) => w !== right && w.toLowerCase() !== right.toLowerCase() && Math.abs(letters(w) - letters(right)) <= 2 && !(inClosed && closed.has(w.toLowerCase())));
  const wrong = [...new Set(near.map((w) => w.toLowerCase()))].slice(0, 3);
  if (wrong.length < 3) return null;
  const options = shuffle([right, ...wrong], r);
  const prompt = toks.map((t, i) => (i === at ? "____" : t.text)).join("");
  return { id, kind: "gap", lang, prompt, options, answer: options.indexOf(right), reveal: { text: item.t, en: item.e } };
}

const NOT_NAMES = new Set("The A An He She It They We I You In On At But And So If When As This That There His Her Then What Do Is Was Not No Yes With For From Of To By Some One Who How Why Where After Before My Our Your Their Its Mr Mrs Miss Dr".split(" "));
/** The proper names of an English sentence: its capitalised words that are not just a sentence opening. */
export const namesOf = (e: string): string[] => [...new Set((e.match(/\b[A-Z][a-z]+/g) ?? []).filter((w) => !NOT_NAMES.has(w)))];

/** What does this sentence say: four English sentences. Needs the item's English. */
export function meaning(item: Item, pool: readonly Item[], lang: string, r: () => number, id: string, kind: "meaning" | "listen"): Question | null {
  if (!item.e) return null;
  const near = shuffle(pool.filter((p) => p.e && p.e !== item.e), r);
  const len = item.e.length;
  // A name in the sentence must not give the answer away: every name of the right answer also appears in a wrong one,
  // or the question is not asked.
  const names = namesOf(item.e);
  const picked: Item[] = [];
  const uncovered = new Set(names);
  while (uncovered.size && picked.length < 3) {
    const cover = (p: Item) => [...uncovered].filter((n) => (p.e as string).includes(n)).length;
    let best: Item | undefined;
    let most = 0;
    for (const p of near) { if (picked.includes(p)) continue; const c = cover(p); if (c > most) { best = p; most = c; if (c === uncovered.size) break; } }
    if (!best) return null;
    picked.push(best);
    for (const n of [...uncovered]) if ((best.e as string).includes(n)) uncovered.delete(n);
  }
  const rest = near.filter((p) => !picked.includes(p)).sort((x, y) => Math.abs((x.e as string).length - len) - Math.abs((y.e as string).length - len)).slice(0, 8);
  const three = [...picked, ...pick(rest, 3 - picked.length, r)].map((p) => p.e as string);
  if (three.length < 3) return null;
  const options = shuffle([item.e, ...three], r);
  return { id, kind, lang, prompt: kind === "listen" ? "" : item.t, say: kind === "listen" ? item.t : undefined, options, answer: options.indexOf(item.e), reveal: { text: item.t, en: item.e } };
}

/** Which of four sentences was it (when there is no translation to ask for). */
export function listenSame(item: Item, pool: readonly Item[], lang: string, r: () => number, id: string): Question | null {
  const len = item.t.length;
  const near = shuffle(pool.filter((p) => p.t !== item.t), r).sort((a, b) => Math.abs(a.t.length - len) - Math.abs(b.t.length - len)).slice(0, 8);
  const three = pick(near, 3, r).map((p) => p.t);
  if (three.length < 3) return null;
  const options = shuffle([item.t, ...three], r);
  return { id, kind: "listen", lang, prompt: "", say: item.t, options, answer: options.indexOf(item.t), reveal: { text: item.t, en: item.e } };
}

/** Most words a word-order question can ask for. */
const ORDER_MAX = 24;
const orderable = (item: Item): boolean => { if (!item.e) return false; const n = wordsOf(item.t).length; return n >= 4 && n <= ORDER_MAX; };

/** Put the words of a whole sentence in order. It is asked only with the sentence's English (the meaning is the clue), so a bank without translations has none. */
function order(item: Item, lang: string, r: () => number, id: string): Question | null {
  if (!orderable(item)) return null;
  const solution = wordsOf(item.t);
  let words = shuffle(solution, r);
  for (let i = 0; i < 4 && words.join(" ") === solution.join(" "); i++) words = shuffle(solution, r);
  return { id, kind: "order", lang, prompt: item.e ?? "", words, solution, reveal: { text: item.t, en: item.e } };
}

/** What does this word mean: from the matched words of the bank, or a deck's phrases. */
export function vocab(pairs: readonly [string, string][], lang: string, r: () => number, id: string, at: number): Question | null {
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
export function makePaper(args: { lang: string; level: Cefr; kind: TestKind; bank: readonly Item[]; phrases?: readonly Phrase[]; seed: number; /** How many questions; PAPER_SIZE by default. */ size?: number; /** A level exam: harder sentences, and for a deck its whole second half. */ exam?: boolean }): Paper {
  const { lang, level, kind, bank, phrases, seed, exam } = args;
  const size = Math.max(1, Math.min(60, Math.floor(args.size ?? PAPER_SIZE)));
  const r = rng(seed);
  const pool = exam ? examItemsFor(bank, level) : itemsFor(bank, level);
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
  const canOrder = pool.some(orderable);
  const kinds: QuestionKind[] = kind === "mixed"
    ? Array.from({ length: size }, (_, i) => MIX[i % MIX.length]).map((k, i) => (k === "vocab" && !canVocab) || (k === "meaning" && !canMean) ? (i % 2 && canOrder ? "order" : "gap") : k === "order" && !canOrder ? "gap" : k)
    : Array.from({ length: size }, () => kind);

  const questions: Question[] = [];
  let s = 0;
  let v = 0;
  const vOrder = shuffle(vocabPairs.map((_, i) => i), r);
  const used = new Set<string>();
  for (const k of kinds) {
    if (questions.length >= size) break;
    let q: Question | null = null;
    if (k === "vocab") {
      while (!q && v < vOrder.length) { q = vocab(vocabPairs, lang, r, `v${v}`, vOrder[v]); v++; }
    } else {
      for (let tries = 0; !q && tries < (k === "order" ? 120 : 40) && s < sentences.length; tries++, s++) {
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

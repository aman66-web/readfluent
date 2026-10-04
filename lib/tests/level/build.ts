/**
 * Makes test number `n` of a level, pure and fixed: the same language, level and number always give the same test
 * (so the server can keep it, and "test 3" means the same thing tomorrow). Nothing here reads a file: the route brings
 * the passages and the vocabulary (app/api/level-test).
 */
import type { Cefr } from "@/lib/xp/levels";
import { sentenceRanges } from "@/lib/reading/sentences";
import { listenSame, rng, shuffle, vocab, type Item } from "../build";
import type { Question } from "../types";
import { TESTS_PER_LEVEL, type LevelPassage, type LevelTest, type Step } from "./types";

const sentencesOf = (text: string): string[] => sentenceRanges(text).map(([a, b]) => text.slice(a, b).trim()).filter(Boolean);
const size = (s: string): number => [...s].length;

/** Passages for the level, in test order: a test is the passage at its own number. */
export interface Source {
  lang: string;
  level: Cefr;
  n: number;
  /** The ten passages of the level. */
  passages: readonly LevelPassage[];
  /** Word or phrase and its English, for the vocabulary questions (may be empty: then there are none). */
  pairs: readonly (readonly [string, string])[];
}

const LEVEL_SEED: Record<Cefr, number> = { A1: 11, A2: 23, B1: 37, B2: 41, C1: 53, C2: 67 };

/** The shorter part of a passage's sentences (by `share`): what a phone can hear and a reader can type; never fewer than two. */
function speakable(sentences: readonly string[], share: number): string[] {
  const sorted = sentences.filter((s) => size(s) >= 4).sort((a, b) => size(a) - size(b));
  return sorted.slice(0, Math.max(2, Math.ceil(sorted.length * share)));
}

export function buildLevelTest(src: Source): LevelTest | null {
  const { lang, level, n, passages, pairs } = src;
  const p = passages[n - 1];
  if (!p || n < 1 || n > TESTS_PER_LEVEL || !p.text.trim()) return null;
  const r = rng(LEVEL_SEED[level] * 1000 + n * 17 + lang.charCodeAt(0) * 3 + lang.charCodeAt(1));
  const passage = { title: p.title, text: p.text };
  const own = sentencesOf(p.text);
  const steps: Step[] = [];

  // 1. Reading: four questions about the passage.
  for (const q of p.qs.slice(0, 4)) steps.push({ part: "read", passage, q: q.q, options: q.o, answer: q.a });

  // 2. Vocabulary: three words or phrases and what they mean.
  if (pairs.length >= 8) {
    const order = shuffle(pairs.map((_, i) => i), r);
    let made = 0;
    for (const at of order) {
      if (made >= 3) break;
      const q = vocab(pairs as [string, string][], lang, r, `v${n}-${at}`, at);
      if (q) { steps.push({ part: "vocab", question: q }); made++; }
    }
  }

  // 3. Listening: hear a sentence of the passage, pick which one it was among sentences of the level's other passages.
  const others = passages.filter((x) => x !== p).flatMap((x) => sentencesOf(x.text));
  const pool: Item[] = [...own, ...others].map((t) => ({ b: 0, t }));
  const hearable = speakable(own, 0.8);
  const heard = shuffle(hearable, r).slice(0, 2);
  heard.forEach((s, i) => {
    const q = listenSame({ b: 0, t: s }, pool, lang, r, `l${n}-${i}`);
    if (q) steps.push({ part: "listen", question: q as Question });
  });

  // 4. Writing: type a sentence from dictation, then answer about the passage.
  const dictation = shuffle(speakable(own, 0.5).filter((s) => !heard.includes(s)), r)[0] ?? shuffle(speakable(own, 0.5), r)[0];
  if (dictation) steps.push({ part: "dictate", say: dictation });
  steps.push({ part: "write", prompt: p.write.prompt, min: p.write.min, keys: p.keys, passage });

  // 5. Speaking: two sentences to read aloud.
  const used = new Set<string>([...heard, ...(dictation ? [dictation] : [])]);
  const pool2 = shuffle(speakable(own, 0.8), r);
  const toSay = [...pool2.filter((x) => !used.has(x)), ...pool2.filter((x) => used.has(x))].slice(0, 2);
  for (const s of toSay) steps.push({ part: "speak", text: s });

  return { lang, level, n, steps };
}

/** Whether a test can be asked in a language: it needs the passage translated. */
export const hasPassages = (passages: readonly LevelPassage[] | undefined): boolean => !!passages && passages.length >= TESTS_PER_LEVEL && passages.every((x) => x.text.trim().length > 0);

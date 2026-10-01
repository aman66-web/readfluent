import { readFileSync } from "node:fs";
import { LEVEL_SPECS } from "./config";
import type { Issue, LevelKey } from "./types";
import { sentences, syllables, words } from "./text";

/**
 * Is this English page about the right difficulty for its level? A proxy, not a certificate:
 * there is no free CEFR word list to check against, so word difficulty is the Zipf frequency of
 * each word in a large corpus (wordfreq, the 30,000 most common English words; data/en-zipf.json),
 * plus sentence length and a Flesch–Kincaid grade. Thresholds are in config.ts, calibrated on the
 * owner's template pages. It flags; a person decides.
 */
const ZIPF: Record<string, number> = JSON.parse(readFileSync(new URL("./data/en-zipf.json", import.meta.url), "utf8"));

/** Words that are not content: they are always easy and never tell us anything. */
const FUNCTION = new Set(("a an the and or but if so as of to in on at by for with from up down out over under into onto off than that this these those " +
  "i me my mine you your yours he him his she her hers it its we us our ours they them their theirs " +
  "is am are was were be been being do does did done have has had having will would can could shall should may might must not no yes " +
  "who whom whose which what when where why how there here then too very just also all any each every some such more most other another").split(" "));

const clean = (w: string) => w.toLowerCase().replace(/'s$/, "").replace(/[’']/g, "");

function direct(word: string): number | undefined {
  return ZIPF[word.toLowerCase()] ?? ZIPF[clean(word)];
}

/** Base forms an English word might come from: "gyms" → "gym", "tried" → "try", "running" → "run". */
function stems(w: string): string[] {
  const out: string[] = [];
  if (w.endsWith("ies")) out.push(`${w.slice(0, -3)}y`);
  if (w.endsWith("es")) out.push(w.slice(0, -2));
  if (w.endsWith("s")) out.push(w.slice(0, -1));
  if (w.endsWith("ied")) out.push(`${w.slice(0, -3)}y`);
  if (w.endsWith("ed")) out.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith("ing")) out.push(w.slice(0, -3), `${w.slice(0, -3)}e`);
  if (/([b-df-hj-np-tv-z])\1(ed|ing)$/.test(w)) out.push(w.replace(/([b-df-hj-np-tv-z])\1(ed|ing)$/, "$1"));
  if (w.endsWith("ly")) out.push(w.slice(0, -2));
  if (w.endsWith("er") || w.endsWith("est")) out.push(w.replace(/(er|est)$/, ""));
  return out;
}

/** How common a word is (Zipf). An inflected form of a common word counts as the common word: "gyms" is as easy as "gym". */
/** A name of the book, or its plural or possessive: "Bennet", "Bennets", "Bennet's". */
function isName(w: string, names?: ReadonlySet<string>): boolean {
  return !!names && (names.has(w) || names.has(w.replace(/['’]s$/, "")) || names.has(w.replace(/s$/, "")));
}

export function zipf(word: string): number | undefined {
  const w = word.toLowerCase();
  let best = direct(w);
  if (best === undefined && w.includes("-")) {
    // "thirty-four", "well-known": as hard as the hardest part.
    const parts = w.split("-").map(zipf);
    best = parts.every((z) => z !== undefined) ? Math.min(...(parts as number[])) : undefined;
  }
  if (best === undefined || best < 3.8) for (const st of stems(w)) { const z = direct(st); if (z !== undefined && (best === undefined || z - 0.2 > best)) best = z - 0.2; }
  return best;
}

export interface PageStats {
  sentences: number;
  sentenceWords: number[];
  grade: number;
  meanZipf: number;
  rare: string[];
}

/** Flesch–Kincaid grade with names left out: "Elizabeth" is four syllables and no harder to read than "Anna". */
function grade(en: string): number {
  const sents = Math.max(1, sentences(en).length);
  const toks = words(en).filter((t) => !(/^\p{Lu}/u.test(t.text) && zipf(t.text) === undefined));
  if (toks.length === 0) return 0;
  const syl = toks.reduce((n, t) => n + syllables(t.text), 0);
  return 0.39 * (toks.length / sents) + 11.8 * (syl / toks.length) - 15.59;
}

/** The numbers behind the flags. Capitalised words that are not in the list are names, and are skipped. */
export function pageStats(en: string, names?: ReadonlySet<string>): PageStats {
  const sents = sentences(en);
  const sentenceWords = sents.map((s) => words(s).length);
  const toks = words(en);
  const content: number[] = [];
  const rareWords: { w: string; z: number }[] = [];
  toks.forEach((t) => {
    if (FUNCTION.has(t.lower) || isName(t.lower, names)) return;
    const z = zipf(t.text);
    if (z === undefined) {
      if (/^\p{Lu}/u.test(t.text)) return;           // a name
      rareWords.push({ w: t.lower, z: 0 });
      content.push(0);
      return;
    }
    content.push(z);
    rareWords.push({ w: t.lower, z });
  });
  const mean = content.length ? content.reduce((a, b) => a + b, 0) / content.length : 7;
  return { sentences: sents.length, sentenceWords, grade: grade(en), meanZipf: mean, rare: rareWords.filter((r) => r.z < 3.2).map((r) => r.w) };
}

export function cefrIssues(en: string, level: LevelKey, names?: ReadonlySet<string>): Issue[] {
  const spec = LEVEL_SPECS[level];
  const st = pageStats(en, names);
  const out: Issue[] = [];
  st.sentenceWords.forEach((n, i) => {
    if (n < spec.tolerance.min) out.push({ code: "too-short", message: `sentence ${i + 1} has ${n} words; ${spec.label} sentences run ${spec.guide.min}–${spec.guide.max}` });
    if (n > spec.tolerance.max) out.push({ code: "too-long", message: `sentence ${i + 1} has ${n} words; ${spec.label} sentences run ${spec.guide.min}–${spec.guide.max}` });
  });
  if (spec.rareBelow !== undefined) {
    const rare = toksRare(en, spec.rareBelow, names);
    if (rare.length > spec.rareAllowed) out.push({ code: "too-hard-words", message: `words too rare for ${spec.label}: ${rare.join(", ")}` });
  }
  if (spec.maxGrade !== undefined && st.grade > spec.maxGrade) out.push({ code: "too-hard-grade", message: `reads at grade ${st.grade.toFixed(1)}, above ${spec.maxGrade} for ${spec.label}` });
  if (spec.minGrade !== undefined && st.grade < spec.minGrade) out.push({ code: "too-easy-grade", message: `reads at grade ${st.grade.toFixed(1)}, below ${spec.minGrade} for ${spec.label}` });
  if (spec.tooEasyMeanZipf !== undefined && st.meanZipf > spec.tooEasyMeanZipf) out.push({ code: "too-easy-words", message: `vocabulary is too plain for ${spec.label} (mean frequency ${st.meanZipf.toFixed(2)})` });
  return out;
}

function toksRare(en: string, below: number, names?: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const t of words(en)) {
    if (FUNCTION.has(t.lower) || isName(t.lower, names)) continue;
    const z = zipf(t.text);
    if (z === undefined) { if (!/^\p{Lu}/u.test(t.text)) out.push(t.lower); continue; }
    if (z < below) out.push(t.lower);
  }
  return [...new Set(out)];
}

/** The names a book uses: every capitalised word of its bible, lower case. They are never "rare words". */
export function namesOf(bible: string): Set<string> {
  return new Set([...bible.matchAll(/\p{Lu}[\p{L}'’-]+/gu)].map((m) => m[0].toLowerCase().replace(/'s$/, "")));
}

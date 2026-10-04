import { tokenize } from "@/lib/reading/sentences";
import type { Key } from "@/lib/reading/keys";
import { linkKeys, type Hit } from "./wordalign";

/**
 * Matching the words of a page to the words of its English line, with the phone's own translator, for pages the phone
 * translated (the hand-checked pages come with their matches). A few English words or phrases are picked; each is marked
 * in square brackets in the English, the page is translated again, and the words the translator put between the brackets
 * are what it became. A match is kept only if those words really stand in the page's text.
 */
const STOP = new Set(("about above after again against along also always among around because been before being below between both but " +
  "cannot could does doing down during each either else even ever every from further have having here herself himself hers into itself just " +
  "like many might more most much must myself once only other ought ours ourselves over same shall should since some such than that their theirs them " +
  "themselves then there these they this those through under until upon very were what when where which while whom whose will with within without would " +
  "yours yourself yourselves said says").split(" "));

const SHORT = new Set("the and for but not you are was has had his her him she one two our out who how why can did got may now off own say see too use way yet all any its let put".split(" "));

export interface Pick { start: number; end: number; text: string }

/** Up to three things to match in an English line: one two-word phrase if there is one, then the longest single words. */
export function pickKeys(english: string): Pick[] {
  const toks = tokenize(english).filter((t) => t.word);
  const content = (w: string | undefined) => !!w && w.length >= 4 && !STOP.has(w) && !/['’]/.test(w);
  const partOfPhrase = (w: string | undefined) => !!w && w.length >= 3 && !STOP.has(w) && !SHORT.has(w) && !/['’]/.test(w);
  const picks: Pick[] = [];
  const used = new Set<number>();
  // One phrase: two content words side by side (a walking stick, a young man).
  for (let i = 0; i + 1 < toks.length && picks.length < 1; i++) {
    const a = toks[i], b = toks[i + 1];
    if (partOfPhrase(a.word) && partOfPhrase(b.word) && !/^\p{Lu}/u.test(a.text) && !/^\p{Lu}/u.test(b.text) && (content(a.word) || content(b.word)) && english.slice(a.start + a.text.length, b.start).trim() === "") {
      picks.push({ start: a.start, end: b.start + b.text.length, text: `${a.word} ${b.word}` });
      used.add(i); used.add(i + 1);
    }
  }
  const singles = toks.map((t, i) => ({ t, i })).filter(({ t, i }) => !used.has(i) && content(t.word))
    .sort((x, y) => (y.t.word as string).length - (x.t.word as string).length || x.i - y.i);
  const seen = new Set(picks.map((p) => p.text));
  for (const { t } of singles) {
    if (picks.length >= 3) break;
    if (seen.has(t.word as string)) continue;
    seen.add(t.word as string);
    picks.push({ start: t.start, end: t.start + t.text.length, text: t.word as string });
  }
  return picks.sort((a, b) => a.start - b.start);
}

export const markRange = (text: string, start: number, end: number): string => `${text.slice(0, start)}[${text.slice(start, end)}]${text.slice(end)}`;

/** The words between the brackets, if there is exactly one pair and it is short. */
export function bracketed(translated: string): string | null {
  const found = [...translated.matchAll(/\[([^\[\]]+)\]/g)];
  if (found.length !== 1) return null;
  const out = found[0][1].replace(/^[\s.,;:!?¿¡"'“”‘’«»()-]+|[\s.,;:!?¿¡"'“”‘’«»()-]+$/g, "").replace(/\s+/g, " ").toLowerCase();
  return out && out.split(" ").length <= 5 ? out : null;
}

/** True when `phrase` (lower-case words) stands in `text` as whole words, in that order. */
export function standsIn(text: string, phrase: string): boolean {
  const want = tokenize(phrase).flatMap((t) => (t.word ? [t.word] : []));
  const have = tokenize(text).flatMap((t) => (t.word ? [t.word] : []));
  if (!want.length) return false;
  for (let i = 0; i + want.length <= have.length; i++) if (want.every((w, j) => have[i + j] === w)) return true;
  return false;
}

const memo = new Map<string, Key[]>();

/**
 * The matches for one page: `english` is the English page, `target` the same page in `lang`; `fixed` are matches written by hand,
 * which are kept. Every English word is asked about in turn (marked in brackets, all together in one call), and the answers become
 * matches for all the words that can be matched (lib/translate/wordalign.ts). [] when the phone cannot say.
 */
export async function alignPage(english: string, target: string, lang: string, fixed: readonly Key[] = []): Promise<Key[]> {
  if (/[\[\]]/.test(english) || !english.trim() || !target.trim()) return [];
  const cache = `${lang}|${english}|${target}|${fixed.length}`;
  const kept = memo.get(cache);
  if (kept) return kept;
  const ew = tokenize(english).filter((t) => t.word);
  if (!ew.length) return [];
  let keys: Key[] = [];
  try {
    const { deviceKind, deviceStatus, deviceTranslate } = await import("./device");
    if (!deviceKind() || (await deviceStatus("en", lang)) !== "ready") return [];
    const marked = ew.map((t) => markRange(english, t.start, t.start + t.text.length));
    const out = await deviceTranslate(marked, "en", lang);
    const hits: Hit[] = [];
    out.forEach((translated, ei) => { const got = bracketed(translated); if (got) hits.push({ ei, got }); });
    keys = linkKeys(english, target, hits, fixed);
  } catch { return []; }
  memo.set(cache, keys);
  return keys;
}

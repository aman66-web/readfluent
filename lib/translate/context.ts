import { sentenceRanges, tokenize } from "@/lib/reading/sentences";

/**
 * What a tapped word means in its sentence, from the phone's own translator.
 *
 * A word translated alone is a guess ("jeune" came back "Fast", the sound-alike "jeûne"). In its sentence it is not: the
 * sentence is translated with the word between square brackets, and the translator keeps the brackets round whatever the
 * word became. Pure helpers here; the call to the translator is in `meaningInContext`.
 */

/** The sentence a character is in, and the word marked in it, or null for a word that is not a plain word of the text. */
export function markWord(text: string, start: number, word: string): { sentence: string; marked: string } | null {
  const token = text.slice(start, start + word.length);
  if (!word || token.toLowerCase() !== word.toLowerCase() || /[\[\]]/.test(text)) return null;
  const range = sentenceRanges(text).find(([a, b]) => start >= a && start < b) ?? [0, text.length];
  const [a, b] = range;
  const sentence = text.slice(a, b).trim();
  const lead = text.slice(a, b).length - text.slice(a, b).trimStart().length;
  const at = start - a - lead;
  if (at < 0 || at + token.length > sentence.length) return null;
  return { sentence, marked: `${sentence.slice(0, at)}[${token}]${sentence.slice(at + token.length)}` };
}

/** The words the translator put between the brackets, cleaned up; null when there is not exactly one clean answer. */
export function markedAnswer(translated: string, original: string): string | null {
  const found = [...translated.matchAll(/\[([^\[\]]+)\]/g)];
  if (found.length !== 1) return null;
  let out = found[0][1].replace(/^[\s.,;:!?¿¡"'“”‘’«»()-]+|[\s.,;:!?¿¡"'“”‘’«»()-]+$/g, "").replace(/\s+/g, " ");
  if (!out || out.split(" ").length > 4) return null;
  // A word in the middle of a sentence is lower case, whatever the translator did at the start of one.
  if (original === original.toLowerCase() && out.length > 1 && out[0] !== out[0].toLowerCase() && out.slice(1) === out.slice(1).toLowerCase() && out !== "I") out = out[0].toLowerCase() + out.slice(1);
  return out;
}

const memo = new Map<string, string | null>();
const keyOf = (from: string, to: string, marked: string): string => `${from}>${to}|${marked}`;

/** The language to ask in: the reader's own when the phone has it ready, else English; null when neither is. A found answer is kept (a phone that was not ready may be, later). */
const targets = new Map<string, string>();
async function pickTarget(from: string, to: string): Promise<string | null> {
  const k = `${from}>${to}`;
  const known = targets.get(k);
  if (known) return known;
  const { deviceStatus } = await import("./device");
  const target = (await deviceStatus(from, to)) === "ready" ? to : (await deviceStatus(from, "en")) === "ready" ? "en" : null;
  if (target) targets.set(k, target);
  return target;
}

/**
 * What is already known about the word at `start`: its meaning, null when the phone could not say, undefined when it has
 * not been asked yet. Synchronous, so a tap on a word that was prepared shows its card at once.
 */
export function peekMeaning(text: string, start: number, word: string, from: string, to: string): string | null | undefined {
  if (from === to) return null;
  const m = markWord(text, start, word);
  if (!m) return null;
  return memo.get(keyOf(from, to, m.marked));
}

const preparing = new Map<string, Promise<void>>();
const PER_PAGE = 120;

/**
 * Works out the meaning of every word of a page ahead of any tap, in one go (owner, 5 Oct 2026: a tap took ages), so that
 * tapping a word shows its card at once. Quiet: a phone without a translator, or one that is not ready, does nothing here.
 */
export function prepareMeanings(text: string, from: string, to: string): Promise<void> {
  if (from === to || !text) return Promise.resolve();
  const pageKey = `${from}>${to}|${text}`;
  const going = preparing.get(pageKey);
  if (going) return going;
  const job = (async () => {
    const { deviceKind, deviceTranslate } = await import("./device");
    if (!deviceKind()) return;
    const asks = new Map<string, string>();
    for (const t of tokenize(text)) {
      if (!t.word || asks.size >= PER_PAGE) continue;
      const m = markWord(text, t.start, t.word);
      if (m && !memo.has(keyOf(from, to, m.marked))) asks.set(m.marked, t.word);
    }
    if (asks.size === 0) return;
    const target = await pickTarget(from, to);
    if (!target) return;
    const marked = [...asks.keys()];
    const out = await deviceTranslate(marked, from, target);
    marked.forEach((m, i) => memo.set(keyOf(from, to, m), out[i] ? markedAnswer(out[i], asks.get(m) ?? "") : null));
  })().catch(() => { /* a tap asks again for itself */ }).finally(() => { preparing.delete(pageKey); });
  preparing.set(pageKey, job);
  return job;
}

/**
 * The meaning of the word at `start` in `text` (a text in `from`), written in `to`. Null when the phone cannot say, and then
 * the card keeps the word's own entry. Japanese, Chinese and Thai are broken into words by the phone's word breaker (lib/reading/sentences.ts).
 */
export async function meaningInContext(text: string, start: number, word: string, from: string, to: string): Promise<string | null> {
  if (from === to) return null;
  const m = markWord(text, start, word);
  if (!m) return null;
  const key = keyOf(from, to, m.marked);
  if (memo.has(key)) return memo.get(key) ?? null;
  // The page is being prepared right now: wait for it (one batch is quicker than one more call), then look again.
  const going = preparing.get(`${from}>${to}|${text}`);
  if (going) { await going; if (memo.has(key)) return memo.get(key) ?? null; }
  let out: string | null = null;
  try {
    const { deviceKind, deviceTranslate } = await import("./device");
    if (!deviceKind()) return null;
    const target = await pickTarget(from, to);
    if (!target) return null;
    const [translated] = await deviceTranslate([m.marked], from, target);
    out = translated ? markedAnswer(translated, word) : null;
  } catch { out = null; }
  memo.set(key, out);
  return out;
}

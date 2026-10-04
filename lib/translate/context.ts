import { sentenceRanges } from "@/lib/reading/sentences";

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

/**
 * The meaning of the word at `start` in `text` (a text in `from`), written in `to`. Null when the phone cannot say, and then
 * the card keeps the word's own entry. Does nothing for scripts with no spaces (a "word" there is a whole phrase).
 */
export async function meaningInContext(text: string, start: number, word: string, from: string, to: string): Promise<string | null> {
  if (from === to || /^(ja|zh|th)$/.test(from)) return null;
  const m = markWord(text, start, word);
  if (!m) return null;
  const key = `${from}>${to}|${m.marked}`;
  if (memo.has(key)) return memo.get(key) ?? null;
  let out: string | null = null;
  try {
    const { deviceKind, deviceStatus, deviceTranslate } = await import("./device");
    if (!deviceKind()) return null;
    const target = (await deviceStatus(from, to)) === "ready" ? to : (await deviceStatus(from, "en")) === "ready" ? "en" : null;
    if (!target) return null;
    const [translated] = await deviceTranslate([m.marked], from, target);
    out = translated ? markedAnswer(translated, word) : null;
  } catch { out = null; }
  memo.set(key, out);
  return out;
}

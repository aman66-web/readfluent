import { tokenize } from "@/lib/reading/sentences";
import { romaniseArabic } from "./arabic";
import { romaniseBengali, romaniseHindi } from "./indic";

/** The languages that can be shown in Latin letters (owner, 4 Oct 2026). */
export const ROMAN_LANGS = ["hi", "bn", "zh", "ur", "ar"] as const;
export type RomanLang = (typeof ROMAN_LANGS)[number];
export const hasRoman = (lang: string): lang is RomanLang => (ROMAN_LANGS as readonly string[]).includes(lang);

/** Latin letters for a piece of text (one word, or a run with spaces), or the text itself where it cannot. Chinese loads its dictionary the first time. */
export type Romaniser = (text: string) => string;

export async function romaniserFor(lang: string): Promise<Romaniser | null> {
  switch (lang) {
    case "hi": return (s) => s.split(/(\s+)/).map((w) => (w.trim() ? romaniseHindi(w) : w)).join("");
    case "bn": return (s) => s.split(/(\s+)/).map((w) => (w.trim() ? romaniseBengali(w) : w)).join("");
    case "ar": return (s) => s.split(/(\s+)/).map((w) => (w.trim() ? romaniseArabic(w, "ar") : w)).join("");
    case "ur": return (s) => s.split(/(\s+)/).map((w) => (w.trim() ? romaniseArabic(w, "ur") : w)).join("");
    case "zh": {
      const { pinyin } = await import("pinyin-pro");
      return (s) => pinyin(s, { toneType: "symbol", type: "string" });
    }
    default: return null;
  }
}

/** Full stops and marks of other scripts, as Latin ones, when a text is shown in Latin letters. */
const MARKS: Record<string, string> = { "।": ".", "॥": ".", "۔": ".", "؟": "?", "،": ",", "。": ".", "，": ",", "、": ",", "！": "!", "？": "?", "：": ":", "；": ";" };

/** The marks of other scripts as Latin ones. */
export const latinMarks = (text: string): string => [...text].map((c) => MARKS[c] ?? c).join("");

/** A whole text in Latin letters: the words by `convert`, the marks between them as Latin ones. */
export function romanText(text: string, convert: Romaniser): string {
  return tokenize(text).map((tok) => (tok.word ? convert(tok.text) : latinMarks(tok.text))).join("");
}

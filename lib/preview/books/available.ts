/**
 * Which languages a book can be read in, besides English: those with a translation file whose three levels
 * match the English page for page and whose words nearly all have a word card (the same bar the reader
 * holds, app/read/.../page.tsx, so the book's page never promises what the reader will not open).
 * Server only.
 */
import { LEVELS } from "@/lib/content/limits";
import { tokenize } from "@/lib/reading/sentences";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { translatorConfigured } from "@/lib/translate/google";
import { loadDictionary, loadEnglish, loadTranslation } from "./load";

const TRANSLATIONS = ["es"] as const;

export async function readableLanguages(slug: string, source: "file" | undefined): Promise<string[]> {
  if (source !== "file") return [];
  const en = await loadEnglish(slug);
  if (!en) return [];
  // With the machine translator switched on, a book opens in any language (app/api/translate).
  if (translatorConfigured()) return LANGUAGES.filter((l) => l.code !== "en").map((l) => l.code);
  const out: string[] = [];
  for (const lang of TRANSLATIONS) {
    const tr = await loadTranslation(slug, lang);
    if (!tr) continue;
    let ok = true;
    for (const lv of LEVELS) {
      const pages = tr.levels[lv.id];
      if (!pages || pages.length !== en.levels[lv.id].length) { ok = false; break; }
      const words = new Set(pages.flatMap((p) => tokenize(p.text).flatMap((t) => (t.word ? [t.word] : []))));
      const dict = await loadDictionary(lang, words);
      if (Object.keys(dict).length < words.size * 0.9) { ok = false; break; }
    }
    if (ok) out.push(lang);
  }
  return out;
}

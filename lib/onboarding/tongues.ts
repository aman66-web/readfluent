import { LANGUAGES, type LanguageCode } from "./languages";

/**
 * What the pair of languages means, in words: the reader speaks one (the app and its
 * word meanings are in it) and is learning another (the books are in it). Pure, so the
 * sentence is tested rather than looked at.
 *
 * The books are English today (SPEC.md §4). A choice that cannot be served yet is
 * still saved — it tells the owner which languages to translate into first — and the
 * screen says so plainly instead of promising it.
 */

const name = (code: LanguageCode) => LANGUAGES.find((l) => l.code === code)?.label ?? code;

/** "Reading Spanish, with help in English." */
export function tonguesSummary(speak: LanguageCode, learn: LanguageCode | null): string {
  if (!learn) return "Choose the language you want to learn.";
  return `Reading ${name(learn)}, with help in ${name(speak)}.`;
}

/** What is not available yet about this pair, or null when all of it is. */
export function tonguesNote(speak: LanguageCode, learn: LanguageCode | null): string | null {
  if (learn && learn !== "en") return `The books are in English today. We've saved ${name(learn)} and will tell you when it arrives.`;
  if (learn === "en" && speak !== "en") return `Word meanings in ${name(speak)} are coming. For now they appear in English.`;
  return null;
}

import { languageName, type MessageId } from "@/lib/i18n";
import type { LanguageCode } from "./languages";

/**
 * What the pair of languages means, in words: the reader speaks one (the app and its
 * word meanings are in it) and is learning another (the books are in it). Pure, so the
 * sentences are tested rather than looked at.
 *
 * The books are English today (SPEC.md §4). A choice that cannot be served yet is
 * still saved — it tells the owner which languages to translate into first — and the
 * screen says so plainly instead of promising it.
 */

type T = (id: MessageId, vars?: Record<string, string | number>) => string;

/** A sentence that starts with a language's name starts with a capital, whatever the language does mid-sentence. */
const sentence = (text: string, locale: LanguageCode) => (text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text);

/** "Reading Spanish, with help in English." */
export function tonguesSummary(t: T, locale: LanguageCode, speak: LanguageCode, learn: LanguageCode | null): string {
  if (!learn) return t("tongues.pick");
  return sentence(t("tongues.summary", { learn: languageName(learn, locale), speak: languageName(speak, locale) }), locale);
}

/**
 * The languages a card can offer: every one except the language on the other card. The two
 * cannot be the same (owner, 1 Oct 2026): you do not learn a language through itself.
 */
export function choicesFor<T extends { code: LanguageCode }>(which: "speak" | "learn", speak: LanguageCode, learn: LanguageCode | null, all: readonly T[]): T[] {
  const other = which === "speak" ? learn : speak;
  return all.filter((l) => l.code !== other);
}

/** What is not available yet about this pair, or null when all of it is. */
export function tonguesNote(t: T, locale: LanguageCode, speak: LanguageCode, learn: LanguageCode | null): string | null {
  const en = languageName("en", locale);
  if (learn && learn !== "en") return sentence(t("tongues.noteBooks", { en, learn: languageName(learn, locale) }), locale);
  if (learn === "en" && speak !== "en") return sentence(t("tongues.noteWords", { en, speak: languageName(speak, locale) }), locale);
  return null;
}

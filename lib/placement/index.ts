import type { LanguageCode } from "@/lib/onboarding/languages";
import type { Item } from "./engine";
import { BANK_EN } from "./bank-en";

/** The question bank for a language, or null while that language has none (only English has one so far). */
export function bankFor(code: LanguageCode | null | undefined): readonly Item[] | null {
  return (code ?? "en") === "en" ? BANK_EN : null;
}

export const hasPlacement = (code: LanguageCode | null | undefined): boolean => bankFor(code) !== null;

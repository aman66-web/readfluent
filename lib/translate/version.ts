/**
 * One version of a book in the language being learned, made by the Google machine translator. Server only
 * (lib/translate/google.ts holds the key). The work itself is in lib/translate/variant.ts, which the phone's
 * on-device translator shares.
 */
import type { ReaderVariant } from "@/components/reader/types";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { translateTexts } from "./google";
import { buildVariantWith, type TranslateFn } from "./variant";

export { uniqueWords } from "./variant";

export async function buildVariant(english: readonly string[], lang: LanguageCode, speak: LanguageCode, translate: TranslateFn = (texts, from, to) => translateTexts(texts, from as LanguageCode, to as LanguageCode)): Promise<ReaderVariant> {
  return buildVariantWith(english, lang, speak, translate);
}

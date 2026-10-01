import type { LanguageCode } from "@/lib/onboarding/languages";

/**
 * Time spent reading, said the way a person says it in their language: minutes under
 * three hours ("140 minutes"), whole hours after that ("121 hours"), rounded down so it
 * never claims more than the arithmetic. The unit's name comes from the browser.
 */
export function formatReadingTime(minutes: number, locale: LanguageCode = "en"): string {
  const [value, unit] = minutes < 180 ? [Math.round(minutes), "minute"] : [Math.floor(minutes / 60), "hour"];
  try {
    return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(value);
  } catch {
    return `${value} ${unit}${value === 1 ? "" : "s"}`;
  }
}

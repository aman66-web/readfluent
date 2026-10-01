/**
 * The languages offered on the "pick your language" step: the twenty with the
 * most speakers. ReadFluent is English-only for now (SPEC.md §4); the pick is kept
 * so translation can start with the languages readers actually ask for.
 */
export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "fr", label: "French", native: "Français" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "uk", label: "Ukrainian", native: "Українська" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const isLanguage = (v: unknown): v is LanguageCode => LANGUAGES.some((l) => l.code === v);

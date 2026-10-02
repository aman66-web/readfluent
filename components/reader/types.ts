import type { ArtId } from "@/components/ObjectPhoto";
import type { LanguageCode } from "@/lib/onboarding/languages";
import type { KeyPair, WordEntry } from "@/lib/preview/spanish";

/** One page of one version, as the reader shows it. `target` is present where the page is in the language being learned, with its translation. */
export interface ReaderPage {
  n: number;
  text: string;
  scene: number;
  target?: { translation: string; keys: KeyPair[]; /** The object picture the template used for this page; without one the page has the scene picture like any other. */ art?: ArtId; bg?: string };
}

/** A version of the book in one language. Word cards need a dictionary; a version without one is plain reading. */
export interface ReaderVariant {
  lang: LanguageCode;
  pages: ReaderPage[];
  dict?: Record<string, WordEntry>;
}

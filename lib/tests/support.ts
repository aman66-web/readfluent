import { CEFR, type Cefr } from "@/lib/xp/levels";
import type { TestKind } from "./types";

/**
 * Which tests a language has, so the screens know what to offer. Spanish has the full set from translated books;
 * English tests are made from the English books (no translations to ask for, so no "meaning" or word-order questions: order needs the meaning as its clue);
 * every other language has its phrase deck (vocab at A1 and A2). More come as books are translated
 * (lib/tests/corpus.<lang>.json, scripts/books/build-test-corpus.ts).
 */
export interface Support { kinds: readonly TestKind[]; levels: readonly Cefr[] }

const ALL = CEFR;
export function supportFor(lang: string | null | undefined): Support | null {
  if (!lang) return null;
  if (lang === "es") return { kinds: ["mixed", "vocab", "gap", "meaning", "order", "listen"], levels: ALL };
  if (lang === "en") return { kinds: ["mixed", "gap", "listen"], levels: ALL };
  if (/^[a-z]{2}$/.test(lang)) return { kinds: ["vocab"], levels: ["A1", "A2"] };
  return null;
}

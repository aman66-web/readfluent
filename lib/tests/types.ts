import type { Cefr } from "@/lib/xp/levels";

/**
 * The kinds of test. Each is a paper of ten questions of one kind (or a mix) at one level:
 *   vocab    what does this word or phrase mean?
 *   gap      the missing word of a sentence
 *   meaning  what does this sentence say? (pick its English)
 *   order    put the words in order
 *   listen   hear it and say what it was
 *   mixed    a bit of each
 */
export const TEST_KINDS = ["mixed", "vocab", "gap", "meaning", "order", "listen"] as const;
export type TestKind = (typeof TEST_KINDS)[number];
export const isTestKind = (v: unknown): v is TestKind => (TEST_KINDS as readonly unknown[]).includes(v);

export type QuestionKind = Exclude<TestKind, "mixed">;

/** One question, ready to ask. `answer` is the index of the right option; an `order` question has `words` (shuffled) and `solution`. */
export interface Question {
  id: string;
  kind: QuestionKind;
  /** The language the text is in (the sentence, the word): what it is read aloud in. */
  lang: string;
  /** What is shown: a word, a sentence with "____" for the gap, a sentence, or the instruction's subject. */
  prompt: string;
  /** For `listen`: what is read aloud. */
  say?: string;
  options?: string[];
  answer?: number;
  words?: string[];
  solution?: string[];
  /** Shown after answering: the sentence in full and what it means, or the word and its meaning. */
  reveal?: { text: string; en?: string };
}

export interface Paper { lang: string; level: Cefr; kind: TestKind; questions: Question[] }

/** Questions in a paper. */
export const PAPER_SIZE = 10;

import { LEVEL_SPECS } from "./config";
import type { Beat, BeatSheet, CatalogueBook, LevelKey, UnitPage } from "./types";

/**
 * Every prompt the pipeline sends, and the JSON each one must come back as. The rules the owner
 * gave (readfluent-claude-code-prompt.md, 1 Oct 2026) are written out here so a model that has
 * never seen that brief writes the right thing.
 */

// ── shared rules ────────────────────────────────────────────────────────────

export const SYSTEM_BASE = `You write the text of books for ReadFluent, an app that teaches a language by reading real books retold at the reader's level. Spanish is the first language and English is the source text. Your output is data: reply with the JSON the request asks for and nothing else.

Content rules
- Keep everything suitable for a general audience. Treat dark subjects such as war, crime and slavery factually and respectfully.
- Health: factual and cautious, never a diagnosis, never a treatment plan for a person.
- Religion and philosophy: respectful and neutral, correctly attributed, no preaching.
- History and science: accurate. Do not invent facts, dates, quotes or numbers. Where something is uncertain or disputed, say so in the text.
- Never mention, describe or ask for images, pictures, photographs or illustrations.

Writing rules that apply to every sentence
- Write titles without a full stop: "Mr Darcy", "Mrs Bennet", "Dr Lee" (and "el señor", "la doctora" in Spanish). Never use "..." or "…". Never use abbreviations that end in a full stop. Write numbers in words under ten.
- A sentence ends with one of . ! ? and nowhere else. Direct speech is fine inside a sentence ("She said, “No, thank you.”"), but never put . ! or ? inside a quotation unless the quotation also ends the sentence.
- No markdown, no asterisks, no bullet points, no notes to the reader, no stage directions, no mention of pages, beats or levels.`;

export const LEVEL_GUIDE: Record<LevelKey, string> = {
  A: `A1–A2 (beginner). ONE sentence per page, 8 to 14 words. Simple present and simple past (and "going to"), the most common everyday words, concrete vocabulary, no idioms, no phrasal-verb puzzles, no passive voice, no relative clauses. Proper names are fine. A beginner must understand every word without a dictionary except the three key words.`,
  B: `B1–B2 (intermediate). TWO sentences per page, 12 to 22 words each. A wider range of tenses (present perfect, past perfect, conditionals, the passive now and then) and connectors (although, because, however, as soon as, instead). Everyday vocabulary plus topic words. Natural, fluent prose; an occasional common idiom is fine.`,
  C: `C1–C2 (advanced). THREE sentences per page, 18 to 35 words each. Rich, precise and nuanced vocabulary, subordinate clauses, abstract nouns, figurative language, varied sentence rhythm. It should read like good prose, close to the original's register. Do not make it plain.`,
};

export const SPANISH_RULES = `Spanish
- Neutral Latin American Spanish. Use "ustedes", never "vosotros". Avoid Spain-only words (coger, ordenador, móvil, zumo, vale, vuestro). Prefer "computadora", "celular", "jugo", "manejar".
- The Spanish is a natural translation of the English page at the SAME level, with the SAME number of sentences in the SAME order. Do not add or drop a sentence. Match the level: a beginner page uses simple Spanish too.

Key pairs
- Each page has exactly 3 key pairs: {"es": "oyó", "en": "heard"}. They are the three most useful vocabulary words of the page for a learner of that level.
- "es" is ONE word exactly as it is written in the Spanish text of that page (same letters and accents, lower case). "en" is ONE word exactly as it is written in the English text. They must be in the same sentence number (1st, 2nd or 3rd) of the two texts. Never pick articles, pronouns, prepositions or conjunctions. Pick three different words.`;

export const SLOT_GUIDE = `Every beat is written as five pages:
- "p50": the WHOLE beat on one page. This is the only page of the beat in the shortest edition, so it must carry the beat's main point by itself.
- "c1" and "c2": two consecutive pages that tell the beat. c1 opens it, c2 carries it forward and closes it. Together they read as a smooth two-page telling.
- "x1" and "x2": detail pages. x1 is read straight after c1, and x2 straight after c2. They add detail, an example, a sensory image or a feeling. They NEVER add new plot or a new idea, never repeat c1 or c2, and never contradict them. The reader must find the order c1, x1, c2, x2 natural.
Every page is complete on its own: 1, 2 or 3 sentences as the level requires, not a fragment.`;

// ── schemas ─────────────────────────────────────────────────────────────────

const str = { type: "string" } as const;
const obj = (properties: Record<string, unknown>, required?: string[]) => ({ type: "object", properties, required: required ?? Object.keys(properties), additionalProperties: false });
const arr = (items: unknown) => ({ type: "array", items });

export const KEY_SCHEMA = obj({ es: str, en: str });
export const UNIT_SCHEMA = obj({
  pages: arr(obj({ beat: { type: "integer" }, slot: { type: "string", enum: ["p50", "c1", "c2", "x1", "x2"] }, en: str, es: str, keys: arr(KEY_SCHEMA) })),
});
export const BEATS_SCHEMA = obj({
  public_domain: obj({ status: { type: "string", enum: ["certain", "unsure"] }, reason: str }),
  title_es: str, blurb_en: str, blurb_es: str, bible: str,
  beats: arr(obj({ n: { type: "integer" }, summary: str, details: str })),
});
export const DICT_SCHEMA = obj({ entries: arr(obj({ word: str, ph: str, pos: str, mean: str, root: str })) });
export const ORIGINALITY_SCHEMA = obj({
  verdict: { type: "string", enum: ["pass", "rewrite"] },
  findings: arr(obj({ beats: arr({ type: "integer" }), kind: { type: "string", enum: ["name", "plot", "phrase", "structure", "term", "example"] }, severity: { type: "string", enum: ["high", "medium", "low"] }, detail: str })),
});

// ── beat sheet ──────────────────────────────────────────────────────────────

export function beatsRequest(book: CatalogueBook, feedback?: string): { system: string; user: string } {
  const classic = book.type === "classic";
  const fiction = /Romance|Crime|Fantasy/.test(book.niche);
  const health = /Health/.test(book.niche);
  const lines: string[] = [];
  lines.push(`Book: "${book.title}"`, `Niche: ${book.niche}`, `Kind: ${classic ? "classic (public domain)" : "original"}`);
  if (book.author) lines.push(`Author: ${book.author}`);
  if (book.inspired_by?.length) lines.push(`Inspired by (a credit only): ${book.inspired_by.join("; ")}`);
  lines.push(`Catalogue notes: ${book.notes}`);
  const task: string[] = [];
  task.push(`Write the BEAT SHEET for this book: exactly 50 beats, in order, in English. Every version of the book, at every level and length, follows it, so the book tells the same story or makes the same argument everywhere.`);
  task.push(`Each beat has "summary" (two or three plain sentences: what happens, or what idea is made) and "details" (concrete material the page writers must use: images, examples, small events, feelings, facts, names. Enough for four pages without inventing plot).`);
  task.push(`Also write "bible": ${fiction
    ? "the names of the characters with one line each, the setting and period, the point of view and tone, and the recurring images. Every writer will read it, so decide names and facts here."
    : "the key terms (in your own plain words), the running examples and metaphors, and the tone. Every writer will read it, so decide the examples here."}`);
  task.push(`Also write "title_es" (the Spanish title; for a classic use its familiar Spanish title), "blurb_en" and "blurb_es" (two or three sentences, an invitation to read, no spoilers).`);
  if (classic) {
    task.push(`CLASSIC. Keep the real title. Retell the story faithfully in your own words from the public-domain original: its real characters, events and order. Never reproduce a modern translation, edition or adaptation. First decide "public_domain": "certain" only if you are sure the work is in the public domain; otherwise "unsure", with the reason. If "unsure", still fill the rest.`);
  } else if (fiction) {
    task.push(`ORIGINAL FICTION. Write a completely new story with new characters, new names, a new setting and a new plot. Keep only the genre and the feel of "${(book.inspired_by ?? []).join("; ")}". Never reuse its characters, scenes, settings or distinctive plot points, never quote it, and do not echo its structure beat for beat. Set "public_domain" to {"status": "certain", "reason": "original work"}.`);
  } else {
    task.push(`ORIGINAL NON-FICTION. Explain the underlying ideas of the subject in your own words with your own examples and metaphors, in your own order. No branded terms, signature stories, named frameworks or phrases from "${(book.inspired_by ?? []).join("; ")}". Do not follow its chapter structure. Set "public_domain" to {"status": "certain", "reason": "original work"}.`);
  }
  if (health) task.push(`HEALTH. Factual and cautious: general information only, no diagnoses, no personal treatment advice, say when evidence is uncertain. The last page of every version of this book is replaced by a standard "this is not medical advice" notice, so beat 50 must be a closing beat that works just before it.`);
  if (/History|Science/.test(book.niche)) task.push(`Accuracy matters: do not invent facts, dates, numbers or quotes. Note in "details" where something is uncertain.`);
  if (/Religion/.test(book.niche)) task.push(`Respectful and neutral. Attribute beliefs to the traditions that hold them ("Buddhists believe…"). No preaching and no ranking of faiths.`);
  if (feedback) task.push(`A reviewer found problems with your last attempt. Fix them all:\n${feedback}`);
  return { system: SYSTEM_BASE, user: `${lines.join("\n")}\n\n${task.join("\n\n")}` };
}

// ── pages ───────────────────────────────────────────────────────────────────

function beatLine(b: Beat): string { return `${b.n}. ${b.summary}`; }

/** The stable part of every page request for a book: sent as a cached block, so the 30 requests of a book share it. */
export function bookContext(book: CatalogueBook, sheet: BeatSheet): string {
  return `BOOK: "${book.title}" (${book.type}${book.author ? `, ${book.author}` : ""})\n\nBIBLE (names, facts, tone: follow it exactly)\n${sheet.bible}\n\nTHE 50 BEATS\n${sheet.beats.map(beatLine).join("\n")}`;
}

/**
 * The system prompt of a page request, as three blocks: the rules every request shares, the book's
 * context (the cached block: all thirty requests of a book share it), and what is specific to the
 * level: its style, the Spanish and key-pair rules, and what each of the five pages of a beat is for.
 */
export function pagesSystem(level: LevelKey, bookBlock: string): { text: string; cache?: boolean }[] {
  return [
    { text: SYSTEM_BASE },
    { text: bookBlock, cache: true },
    { text: `Level\n${LEVEL_GUIDE[level]}\n\n${SPANISH_RULES}\n\n${SLOT_GUIDE}` },
  ];
}

export function pagesUser(level: LevelKey, sheet: BeatSheet, from: number, to: number, feedback?: string): string {
  const beats = sheet.beats.filter((b) => b.n >= from && b.n <= to);
  const prev = sheet.beats.find((b) => b.n === from - 1);
  const next = sheet.beats.find((b) => b.n === to + 1);
  const spec = LEVEL_SPECS[level];
  const parts = [
    `Write the pages for beats ${from} to ${to} at level ${spec.label}: ${beats.length * 5} pages, five for each beat (slots p50, c1, c2, x1, x2), as {"pages": [...]}. Order them by beat, then p50, c1, x1, c2, x2.`,
    prev ? `The beat just before this chunk (already written elsewhere, for continuity only): ${beatLine(prev)}` : "This chunk opens the book.",
    next ? `The beat just after this chunk (for continuity only, do not write it): ${beatLine(next)}` : "This chunk closes the book.",
    `BEATS TO WRITE\n${beats.map((b) => `${b.n}. ${b.summary}\n   Details: ${b.details}`).join("\n")}`,
    `Remember: ${spec.sentences} sentence${spec.sentences === 1 ? "" : "s"} per page in BOTH languages, sentences of ${spec.guide.min}–${spec.guide.max} words, 3 key pairs per page, neutral Latin American Spanish.`,
  ];
  if (feedback) parts.push(`A checker rejected some of your earlier pages. Avoid these problems everywhere:\n${feedback}`);
  return parts.join("\n\n");
}

/** Rewrite only the pages that failed (or that the originality check flagged). */
export function fixUser(level: LevelKey, sheet: BeatSheet, items: { page: UnitPage; problems: string[] }[]): string {
  const spec = LEVEL_SPECS[level];
  const beatNums = [...new Set(items.map((i) => i.page.beat))];
  const beats = sheet.beats.filter((b) => beatNums.includes(b.n));
  return [
    `Rewrite ONLY the pages below, at level ${spec.label}. Return {"pages": [...]} with exactly one rewritten page for each, same "beat" and "slot", in the same order. Keep what each page is for (its slot) and keep it consistent with the beat; change what the problems say.`,
    `BEATS CONCERNED\n${beats.map((b) => `${b.n}. ${b.summary}\n   Details: ${b.details}`).join("\n")}`,
    `PAGES TO REWRITE\n${items.map(({ page, problems }) => `beat ${page.beat}, slot ${page.slot}\nEnglish: ${page.en}\nSpanish: ${page.es}\nProblems:\n${problems.map((p) => `  - ${p}`).join("\n")}`).join("\n\n")}`,
    `Remember: ${spec.sentences} sentence${spec.sentences === 1 ? "" : "s"} per page in BOTH languages, sentences of ${spec.guide.min}–${spec.guide.max} words, 3 key pairs per page (each "es" a single word of the Spanish text, each "en" a single word of the English text, same sentence number), neutral Latin American Spanish.`,
  ].join("\n\n");
}

// ── dictionary ──────────────────────────────────────────────────────────────

export const DICT_SYSTEM = `${SYSTEM_BASE}

You write word cards for a Spanish learner who reads English. Each card is for one Spanish word exactly as it appears in a sentence (an inflected form such as "oyó" gets its own card).
- "ph": an easy respelling in capitals for the stressed syllable, for NEUTRAL LATIN AMERICAN pronunciation: "oh-YOH". Never use "th" (the c/z sound is "s" here: "gracias" = GRAH-syahs). Spanish "ll"/"y" = "y" or "zh" is NOT used; write "y".
- "pos": the part of speech with gender, number or tense: "noun · m.", "adjective · f.", "verb · past", "verb · imperfect", "adverb".
- "mean": the English meaning FOLLOWED BY one short line on when the word is used, joined by " — ": "to say, to tell — the everyday verb for speaking". Under 110 characters. Plain English.
- "root": the base form with its English meaning: "oír — to hear"; "guapo (masculine)" for a feminine or plural adjective; for a word that is already its base form, repeat it with its English meaning: "baile — dance".
Use the sentence given with each word to pick the right sense. Return {"entries": [...]} with one entry per word, "word" exactly as given.`;

export function dictUser(items: { word: string; es: string; en: string }[]): string {
  return `Write a word card for each word.\n\n${items.map((i) => `word: ${i.word}\nSpanish sentence: ${i.es}\nEnglish: ${i.en}`).join("\n\n")}`;
}

// ── originality ─────────────────────────────────────────────────────────────

export const ORIGINALITY_SYSTEM = `${SYSTEM_BASE}

You are a careful editor checking that an original book does not copy the work that inspired it. Compare the text you are given with the inspiration named. List anything that resembles it: character names, character types with the same role and traits, distinctive plot points, scene sequences, settings, signature metaphors, branded terms, named frameworks, and any phrase that echoes it. Be specific and fair: a shared genre, a shared theme, or an idea that is common knowledge is NOT a finding. Mark "high" only for something a reader of the inspiration would call copied; "medium" for a close echo that should be changed; "low" for a faint similarity. "beats" lists the beat numbers concerned (empty if it is about the whole book). Set "verdict" to "rewrite" if there is any high or medium finding, otherwise "pass".`;

export function originalityUser(book: CatalogueBook, material: string, what: "beat sheet" | "text"): string {
  return `Inspiration: ${(book.inspired_by ?? []).join("; ")}\nOriginal title: "${book.title}" (${book.niche})\n\nThe ${what} of the original to check:\n\n${material}`;
}

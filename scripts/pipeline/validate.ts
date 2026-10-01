import { LEVEL_SPECS, SPAIN_ONLY } from "./config";
import { cefrIssues } from "./cefr";
import type { DictEntry, Dictionary, Issue, KeyPair, Length, LevelKey, Page, UnitPage } from "./types";
import { sentenceAt, sentenceRanges, sentences, wordCount, words } from "./text";

/** Everything a book must pass. Each function returns the problems it found, never throws. */

const LEFTOVER = [/\*\*/, /^#{1,6}\s/m, /`/, /\[[A-Za-z ]+\]/, /\bTODO\b/, /\bas an AI\b/i, /^\s*(Note|Page|Beat|Slot)\s*[:\d]/im, /<\/?[a-z][^>]*>/i, /\{\{|\}\}/];

/** Articles, pronouns and the like: not useful as key vocabulary. */
const STOP_EN = new Set("a an the and or but if so as of to in on at by for with from i me my you your he him his she her it its we us our they them their is am are was were be been do did have has had will would this that these those not no".split(" "));
const STOP_ES = new Set("el la los las un una unos unas y o pero si que de del al a en por para con sin yo tú vos usted él ella nosotros ustedes ellos ellas me te se lo le les mi tu su sus nos es son era eran fue ser estar ha han había no".split(" "));

export function pageIssues(p: { es: string; en: string; keys: KeyPair[] }, level: LevelKey, where: string, names?: ReadonlySet<string>): Issue[] {
  const out: Issue[] = [];
  const add = (code: string, message: string) => out.push({ code, message, where });
  const spec = LEVEL_SPECS[level];
  if (!p.en?.trim()) add("empty-en", "English text is empty");
  if (!p.es?.trim()) add("empty-es", "Spanish text is empty");
  if (!p.en?.trim() || !p.es?.trim()) return out;

  for (const re of LEFTOVER) if (re.test(p.en) || re.test(p.es)) add("leftover", `contains markup or an instruction (${re})`);
  if (/\.\.\.|…/.test(p.en + p.es)) add("ellipsis", "ellipsis makes the sentence count ambiguous");
  if (/\b(Mr|Mrs|Ms|Dr|St|Sr|Sra|Dra)\./.test(p.en + p.es)) add("abbreviation", "titles must be written without a full stop (Mr Darcy)");

  const enS = sentences(p.en);
  const esS = sentences(p.es);
  if (enS.length !== spec.sentences) add("en-sentences", `English has ${enS.length} sentences; ${spec.label} pages have ${spec.sentences}`);
  if (esS.length !== enS.length) add("es-sentences", `Spanish has ${esS.length} sentences but English has ${enS.length}`);
  const ratio = wordCount(p.es) / Math.max(1, wordCount(p.en));
  if (ratio < 0.7 || ratio > 1.7) add("es-length", `Spanish is ${wordCount(p.es)} words for ${wordCount(p.en)} in English`);
  const spain = words(p.es).filter((w) => SPAIN_ONLY.includes(w.lower)).map((w) => w.lower);
  if (spain.length) add("spain-spanish", `Spain-only words in Latin American Spanish: ${[...new Set(spain)].join(", ")}`);

  for (const issue of cefrIssues(p.en, level, names)) out.push({ ...issue, where });

  // keys
  if (!Array.isArray(p.keys) || p.keys.length !== 3) { add("keys-count", `needs 3 key pairs, has ${p.keys?.length ?? 0}`); return out; }
  const esRanges = sentenceRanges(p.es);
  const enRanges = sentenceRanges(p.en);
  const esWords = words(p.es);
  const enWords = words(p.en);
  const seenEs = new Set<string>();
  const seenEn = new Set<string>();
  for (const k of p.keys) {
    const es = (k.es ?? "").trim().toLowerCase();
    const en = (k.en ?? "").trim().toLowerCase();
    if (!es || /\s/.test(es)) { add("key-es-shape", `Spanish key "${k.es}" must be a single word`); continue; }
    if (!en || /\s/.test(en)) { add("key-en-shape", `English key "${k.en}" must be a single word`); continue; }
    if (STOP_ES.has(es)) add("key-es-stop", `"${es}" is an article or pronoun, not vocabulary`);
    if (STOP_EN.has(en)) add("key-en-stop", `"${en}" is an article or pronoun, not vocabulary`);
    if (seenEs.has(es) || seenEn.has(en)) add("key-duplicate", `"${es}"/"${en}" is repeated`);
    seenEs.add(es); seenEn.add(en);
    const e = esWords.find((w) => w.lower === es);
    const g = enWords.find((w) => w.lower === en || w.lower.replace(/'s$/, "") === en);
    if (!e) { add("key-es-missing", `"${es}" is not a word of the Spanish text`); continue; }
    if (!g) { add("key-en-missing", `"${en}" is not a word of the English text`); continue; }
    if (sentenceAt(esRanges, e.start) !== sentenceAt(enRanges, g.start)) add("key-sentence", `"${es}" and "${en}" are in different sentences`);
  }
  return out;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** One version: right number of pages, in beat order, with no empty or repeated page. */
export function versionIssues(pages: Page[], level: LevelKey, length: Length, opts: { disclaimer?: boolean; names?: ReadonlySet<string> } = {}): Issue[] {
  const out: Issue[] = [];
  const add = (code: string, message: string, where?: string) => out.push({ code, message, where });
  if (pages.length !== length) add("page-count", `${pages.length} pages; a ${length}-page version has exactly ${length}`);
  const perBeat = length / 50;
  const counts = new Map<number, number>();
  const seen = new Map<string, number>();
  let last = 0;
  pages.forEach((p, i) => {
    const where = `${level}_${length} page ${i + 1}`;
    if (p.n !== i + 1) add("page-number", `page ${i + 1} is numbered ${p.n}`, where);
    if (p.beat < last) add("beat-order", `beat ${p.beat} comes after beat ${last}`, where);
    last = Math.max(last, p.beat);
    counts.set(p.beat, (counts.get(p.beat) ?? 0) + 1);
    const key = norm(p.en);
    if (seen.has(key)) add("duplicate", `same English as page ${seen.get(key)}`, where);
    seen.set(key, i + 1);
    out.push(...pageIssues(p, level, where, opts.names));
  });
  for (let b = 1; b <= 50; b++) if (counts.get(b) !== perBeat) add("beat-pages", `beat ${b} has ${counts.get(b) ?? 0} pages; a ${length}-page version has ${perBeat}`);
  if (opts.disclaimer) {
    const lastPage = pages[pages.length - 1];
    if (!lastPage || !/medical advice/i.test(lastPage.en)) add("disclaimer", "the last page of a health book must say it is not medical advice");
  }
  return out;
}

/** The 200-page version must contain every page of the 100-page version, in order. */
export function containmentIssues(p100: Page[], p200: Page[]): Issue[] {
  const out: Issue[] = [];
  let j = 0;
  for (const p of p100) {
    while (j < p200.length && !(p200[j].beat === p.beat && norm(p200[j].en) === norm(p.en) && norm(p200[j].es) === norm(p.es))) j++;
    if (j >= p200.length) { out.push({ code: "not-contained", message: `page ${p.n} of the 100-page version is not in the 200-page version, in order`, where: `page ${p.n}` }); break; }
    j++;
  }
  return out;
}

export function dictEntryIssues(word: string, e: DictEntry | undefined): Issue[] {
  if (!e) return [{ code: "dict-missing", message: `no word card for "${word}"` }];
  const out: Issue[] = [];
  for (const f of ["ph", "pos", "mean", "root"] as const) if (!e[f] || !String(e[f]).trim()) out.push({ code: "dict-field", message: `"${word}" has no ${f}`, where: word });
  if (e.ph && /th/i.test(e.ph)) out.push({ code: "dict-ph-spain", message: `"${word}" respelling uses "th", which is Spain Spanish; Latin American "c/z" is "s"`, where: word });
  if (e.mean && e.mean.length > 140) out.push({ code: "dict-long", message: `"${word}" meaning is too long`, where: word });
  return out;
}

export function dictionaryIssues(pages: Page[], dict: Dictionary): Issue[] {
  const out: Issue[] = [];
  const seen = new Set<string>();
  for (const p of pages) for (const k of p.keys) {
    const w = k.es.toLowerCase();
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(...dictEntryIssues(w, dict[w]));
  }
  return out;
}

export function unitPageIssues(p: UnitPage, level: LevelKey, names?: ReadonlySet<string>): Issue[] {
  return pageIssues(p, level, `beat ${p.beat} ${p.slot}`, names);
}

import { createHash } from "node:crypto";
import { creditLine, isHealth, nicheSlug } from "./catalogue";
import { MODEL, PIPELINE_VERSION } from "./config";
import { LENGTHS, LEVELS, SLOTS, type BeatSheet, type CatalogueBook, type Length, type LevelKey, type Page, type Slot, type UnitPage } from "./types";

/**
 * A health book ends every version with this notice, in place of its last page. Written by hand
 * (not by a model) so it is always there, always correct, and always the same at every length.
 */
export const DISCLAIMERS: Record<LevelKey, Omit<Page, "n" | "beat">> = {
  A: {
    en: "This book is only for learning, and it is not medical advice.",
    es: "Este libro es solo para aprender, y no es consejo médico.",
    keys: [{ es: "aprender", en: "learning" }, { es: "consejo", en: "advice" }, { es: "médico", en: "medical" }],
  },
  B: {
    en: "This book is for learning and general interest only. It is not medical advice, and it cannot replace a doctor.",
    es: "Este libro es solo para aprender y para el interés general. No es consejo médico, y no puede reemplazar a un doctor.",
    keys: [{ es: "aprender", en: "learning" }, { es: "consejo", en: "advice" }, { es: "reemplazar", en: "replace" }],
  },
  C: {
    en: "This book is written for learning and general interest, and it should never be read as medical advice. It cannot replace the judgement of a doctor, a nurse or any other qualified health professional. Please talk to one of them before you change anything about your own care.",
    es: "Este libro está escrito para aprender y por interés general, y nunca debe leerse como consejo médico. No puede reemplazar el criterio de un doctor, de una enfermera o de cualquier otro profesional de la salud calificado. Habla con alguno de ellos antes de cambiar cualquier cosa de tu propia atención.",
    keys: [{ es: "aprender", en: "learning" }, { es: "criterio", en: "judgement" }, { es: "calificado", en: "qualified" }],
  },
};

const ORDER: Record<Length, Slot[]> = { 50: ["p50"], 100: ["c1", "c2"], 200: ["c1", "x1", "c2", "x2"] };

export type VersionKey = `${LevelKey}_${Length}`;

/** Lay one level's unit pages out as its three versions: 50 = p50, 100 = c1 c2, 200 = c1 x1 c2 x2 per beat. */
export function buildLevel(pages: UnitPage[], level: LevelKey, health: boolean): Record<Length, Page[]> {
  const by = new Map<string, UnitPage>();
  for (const p of pages) by.set(`${p.beat}/${p.slot}`, p);
  const out = {} as Record<Length, Page[]>;
  for (const length of LENGTHS) {
    const list: Page[] = [];
    for (let beat = 1; beat <= 50; beat++) {
      for (const slot of ORDER[length]) {
        const p = by.get(`${beat}/${slot}`);
        if (!p) throw new Error(`level ${level}: beat ${beat} has no ${slot} page`);
        list.push({ n: 0, beat, es: p.es, en: p.en, keys: p.keys });
      }
    }
    if (health) list[list.length - 1] = { n: 0, beat: 50, ...DISCLAIMERS[level] };
    list.forEach((p, i) => { p.n = i + 1; });
    out[length] = list;
  }
  return out;
}

export function buildMeta(book: CatalogueBook, sheet: BeatSheet) {
  return {
    id: book.id,
    number: book.number,
    niche: nicheSlug(book.niche),
    niche_label: book.niche,
    title: book.title,
    title_es: sheet.title_es,
    blurb: { en: sheet.blurb_en, es: sheet.blurb_es },
    type: book.type,
    author: book.author,
    inspired_by: book.inspired_by,
    credit: creditLine(book),
    disclaimers: isHealth(book) ? ["not_medical_advice"] : [],
    languages: ["en", "es"],
    spanish_variety: "Latin American (neutral)",
    beats: 50,
    generated: { pipeline: PIPELINE_VERSION, model: MODEL, at: new Date().toISOString() },
  };
}

export const versionFile = (level: LevelKey, length: Length): string => `${level}_${length}.json`;

/** A stable pseudo-random order, so the review sample for a level stays the same as books are added. */
export function reviewRank(bookId: string, level: LevelKey, n: number): string {
  return createHash("sha1").update(`${bookId}/${level}/${n}`).digest("hex");
}

export const ALL_VERSIONS: VersionKey[] = LEVELS.flatMap((l) => LENGTHS.map((n) => `${l}_${n}` as VersionKey));
export { SLOTS };

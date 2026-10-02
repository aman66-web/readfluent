/**
 * The fixed vocabulary of the product (SPEC.md §2–§5): the three levels, the
 * three lengths, the nine categories, and the one rule about how long a page is.
 *
 * Plain constants, no imports, so the app, the validator (M1) and the content
 * pipeline (M2) all read the same numbers.
 */

/** Words on one page. Used by the validator, the pipeline and the tests; nowhere else may repeat these numbers. */
export const PAGE_WORDS = { min: 28, max: 35 } as const;

/** Words in a text, counted the one way everything counts them: runs of non-space characters. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export const LEVELS = [
  { id: "A1A2", slug: "a1a2", label: "A1–A2", name: "Beginner", blurb: "Short, simple sentences and everyday words." },
  { id: "B1B2", slug: "b1b2", label: "B1–B2", name: "Intermediate", blurb: "Natural language with some longer sentences." },
  { id: "C1C2", slug: "c1c2", label: "C1–C2", name: "Advanced", blurb: "Rich, literary language close to the original." },
] as const;
export type LevelId = (typeof LEVELS)[number]["id"];

export const LENGTHS = [
  { pages: 50, name: "Fast", time: "about 15 minutes" },
  { pages: 100, name: "Medium", time: "about 30 minutes" },
  { pages: 200, name: "Long", time: "about an hour" },
] as const;
export type Length = (typeof LENGTHS)[number]["pages"];

export const CATEGORIES = [
  { id: "romance", label: "Romance", hue: 345 },
  { id: "crime", label: "Crime", hue: 215 },
  { id: "fantasy-scifi", label: "Fantasy & sci-fi", hue: 270 },
  { id: "self-help", label: "Self-help", hue: 35 },
  { id: "business-money", label: "Business & money", hue: 150 },
  { id: "religion-spirituality", label: "Religion & spirituality", hue: 50 },
  { id: "health", label: "Health", hue: 175 },
  { id: "history", label: "History", hue: 20 },
  { id: "science", label: "Science", hue: 200 },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const levelBySlug = (slug: string) => LEVELS.find((l) => l.slug === slug) ?? null;
export const levelById = (id: string) => LEVELS.find((l) => l.id === id) ?? null;
export const lengthByPages = (n: number) => LENGTHS.find((l) => l.pages === n) ?? null;
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id) ?? null;

/** The edition that holds a level of the A1–C2 scale a reader picked at sign-up: A1 and A2 read at A1–A2, and so on. */
export function levelForCefr(cefr: string | null | undefined): LevelId | null {
  if (!cefr) return null;
  const band = cefr.slice(0, 2).toUpperCase();
  return band === "A1" || band === "A2" ? "A1A2" : band === "B1" || band === "B2" ? "B1B2" : band === "C1" || band === "C2" ? "C1C2" : null;
}

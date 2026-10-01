/** The data the book pipeline reads and writes. One place, so the prompts, validators and writers agree. */

export const LEVELS = ["A", "B", "C"] as const;
export type LevelKey = (typeof LEVELS)[number];
export const LENGTHS = [50, 100, 200] as const;
export type Length = (typeof LENGTHS)[number];
export const BEATS = 50;

export interface KeyPair { es: string; en: string }

/** A page as it is saved: `n` counts from 1 inside its version, `beat` is the beat it belongs to. */
export interface Page { n: number; beat: number; es: string; en: string; keys: KeyPair[] }

/**
 * Where a page sits inside its beat. Every beat is written once per level as five pages:
 *   p50  the whole beat on one page (the 50-page version)
 *   c1 c2  two pages that tell the beat (the 100-page version)
 *   x1 x2  two detail pages slotted in after c1 and c2 (the 200-page version adds them)
 */
export const SLOTS = ["p50", "c1", "c2", "x1", "x2"] as const;
export type Slot = (typeof SLOTS)[number];
export interface UnitPage { beat: number; slot: Slot; es: string; en: string; keys: KeyPair[] }

export type BookType = "classic" | "original";
export interface CatalogueBook {
  number: number;
  id: string;
  niche: string;
  title: string;
  type: BookType;
  author?: string;
  inspired_by?: string[];
  notes: string;
}

export interface Beat { n: number; summary: string; details: string }
export interface BeatSheet {
  public_domain?: { status: "certain" | "unsure"; reason: string };
  title_es: string;
  blurb_en: string;
  blurb_es: string;
  /** Characters, names, setting, voice and recurring images for fiction; key terms and running examples for non-fiction. Every level and length follows it. */
  bible: string;
  beats: Beat[];
}

export interface DictEntry { ph: string; pos: string; mean: string; root: string }
export type Dictionary = Record<string, DictEntry>;

export interface Usage { input: number; output: number; cacheRead: number; cacheWrite: number }
export const NO_USAGE: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

export interface Issue { code: string; message: string; where?: string }

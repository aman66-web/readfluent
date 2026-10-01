import { readFileSync } from "node:fs";
import type { CatalogueBook } from "./types";

export function loadCatalogue(file = new URL("./catalogue.json", import.meta.url)): CatalogueBook[] {
  const d = JSON.parse(readFileSync(file, "utf8")) as { books: CatalogueBook[] };
  return d.books;
}

/** "Self-help and personal development" → "self-help-and-personal-development": the folder name. */
export const nicheSlug = (niche: string): string => niche.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const isHealth = (b: CatalogueBook): boolean => /^Health/.test(b.niche);

export function creditLine(b: CatalogueBook): string {
  return b.type === "original"
    ? `Inspired by ${(b.inspired_by ?? []).join(" and ")}. Not affiliated with or endorsed by the author.`
    : `Retold from ${b.title} by ${b.author ?? "its author"}, a work in the public domain.`;
}

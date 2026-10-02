/** One record of the generated catalogue (lib/preview/written.generated.json), made by scripts/books/build-catalog.ts. */
export interface GeneratedBook {
  slug: string;
  title: string;
  /** Who it is by (a classic) or the book it is inspired by. */
  author: string;
  kind: "classic" | "inspired";
  category: string;
  /** The jacket's words. */
  blurb: string;
  /** How its cover is drawn (the same shape as components/welcome/covers.tsx's `Cover`). */
  cover: { bg: string; light?: boolean; title: string[]; size: number; author: string; pieces: { id: string; x: number; y: number; s?: number }[] };
}

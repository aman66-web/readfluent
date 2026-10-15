import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { C, WALL_SLUGS } from "@/components/welcome/covers";
import { ROWS } from "@/components/welcome/FirstScreen";
import { CATEGORIES } from "@/lib/content/limits";
import { EN } from "@/lib/i18n";
import GENERATED from "@/lib/preview/written.generated.json";
import { findBook, normSearch, PREVIEW_BOOKS } from "@/lib/preview/catalog";
import type { GeneratedBook } from "@/lib/preview/generated";
import { inPublicDomain, ORIGINALS, RIGHTS_YEAR } from "@/lib/preview/rights";

vi.mock("next/link", () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, replace() {}, back() {} }), usePathname: () => "/book/x", useSearchParams: () => new URLSearchParams() }));

const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/** The book page as a reader sees it (App Review reads the same page). */
async function jacket(slug: string): Promise<string> {
  const { BookView } = await import("@/components/book/BookView");
  const book = findBook(slug)!;
  return text(renderToStaticMarkup(createElement(BookView, { book, outline: [], langs: [] })));
}

describe("a classic is called public domain only where it is (App Review 5.2.1)", () => {
  const classics = PREVIEW_BOOKS.filter((b) => b.kind === "classic");

  it("knows when the author died and when the original came out, for every classic and nothing else", () => {
    expect(classics.length).toBeGreaterThan(100);
    for (const b of classics) expect(ORIGINALS, `${b.slug}: add it to lib/preview/rights.ts`).toHaveProperty([b.slug]);
    for (const slug of Object.keys(ORIGINALS)) expect(classics.map((b) => b.slug), `${slug} is not a classic in the library`).toContain(slug);
  });

  it("needs both: the author dead 71 years (life + 70) and the original 96 years old (the USA)", () => {
    expect(RIGHTS_YEAR).toBe(2026);
    // George S. Clason died in 1957: in copyright in the UK and the EU until 2028, though the US one ran out.
    expect(inPublicDomain("the-richest-man-in-babylon")).toBe(false);
    expect(inPublicDomain("the-richest-man-in-babylon", 2027)).toBe(false);
    expect(inPublicDomain("the-richest-man-in-babylon", 2028)).toBe(true);
    // Einstein died in 1955: out of copyright from 1 January 2026, not a day before.
    expect(inPublicDomain("relativity-the-special-and-general-theory")).toBe(true);
    expect(inPublicDomain("relativity-the-special-and-general-theory", 2025)).toBe(false);
    // Scripture with no named author counts from when it was written.
    expect(inPublicDomain("tao-te-ching")).toBe(true);
    // A book the list does not know is never public domain.
    expect(inPublicDomain("no-such-book")).toBe(false);
  });

  it("marks exactly the classics that pass, and never an original story", () => {
    for (const b of PREVIEW_BOOKS) expect(b.publicDomain, b.slug).toBe(b.kind === "classic" && inPublicDomain(b.slug));
    expect(classics.filter((b) => !b.publicDomain).map((b) => b.slug)).toEqual(["the-richest-man-in-babylon"]);
  });

  it("says so on the jacket only for a public-domain classic", async () => {
    const pd = await jacket("pride-and-prejudice");
    expect(pd).toContain(EN["book.publicDomain"]);
    expect(pd).toContain("by Jane Austen");

    const clason = await jacket("the-richest-man-in-babylon");
    expect(clason).not.toContain(EN["book.publicDomain"]);
    expect(clason).not.toMatch(/public domain/i);
    expect(clason).toContain(EN["book.retold"]);

    const original = await jacket("trees-talk-to-each-other");
    expect(original).toContain(EN["book.original"]);
    expect(original).not.toMatch(/public domain/i);
  });
});

describe("an original story never names the book behind it (App Review 5.2.1)", () => {
  // For an original story the catalogue's `author` is the in-copyright book it grew from (scripts/books/LIST.json):
  // kept for the owner's records, never shown.
  const originals = PREVIEW_BOOKS.filter((b) => b.kind === "inspired");
  const covers = Object.fromEntries((GENERATED as GeneratedBook[]).map((g) => [g.slug, g.cover]));

  it("leaves it off the cover", () => {
    for (const b of originals) if (covers[b.slug]) expect(covers[b.slug].author, b.slug).toBe("");
  });

  it("leaves it off the jacket: no 'by', no 'inspired by', no title", async () => {
    // A sample, from every shelf: rendering all 160 would be slow and prove no more.
    const sample = CATEGORIES.map((c) => originals.find((b) => b.category === c.id)).filter((b) => b !== undefined);
    expect(sample.length).toBeGreaterThan(5);
    for (const b of sample) {
      const page = await jacket(b.slug);
      expect(page, b.slug).not.toMatch(/inspired by/i);
      expect(page, b.slug).not.toContain(`by ${b.author}`);
      // A one- or two-word title is often an ordinary phrase ("Homo sapiens", "the body"): only a longer one is a name.
      if (normSearch(b.author).split(" ").length >= 3) expect(normSearch(page), `${b.slug} names ${b.author}`).not.toContain(` ${normSearch(b.author)} `);
    }
  });

  it("has no interface text that would credit it", () => {
    // book.inspired / book.inspiredSentence / book.notAffiliated are kept in the catalogues but used by nothing.
    for (const [k, v] of Object.entries(EN)) if (/inspired by/i.test(v)) expect(["book.inspired", "book.inspiredSentence"], k).toContain(k);
  });
});

describe("every cover on the way in is a book in the library", () => {
  it("names a library book for each of the first screen's covers", () => {
    const wall = ROWS.flat();
    expect(wall).toHaveLength(15);
    for (const [key, slug] of Object.entries(WALL_SLUGS)) {
      const book = findBook(slug);
      expect(book, `${key} → ${slug} is not in the library`).not.toBeNull();
      const cover = C[key as keyof typeof C];
      // The cover's title is the book's (a short form allowed: "Alice in Wonderland"), and so is the author's surname.
      const title = normSearch(cover.title.join(" ").replace(/- /g, ""));
      for (const word of title.split(" ")) expect(normSearch(book!.title).split(" "), `${key}: "${word}"`).toContain(word);
      expect(normSearch(book!.author).split(" ").at(-1), key).toBe(normSearch(cover.author).split(" ").at(-1));
      // And it is one we may call a public-domain classic.
      expect(book!.publicDomain, slug).toBe(true);
    }
    // Every cover on the wall is one of them.
    for (const c of wall) expect(Object.values(C)).toContain(c);
  });
});

describe("no shelf says 'coming soon'", () => {
  it("has at least three books on every shelf, so the library never shows a 'Coming soon' tile", () => {
    for (const c of CATEGORIES) expect(PREVIEW_BOOKS.filter((b) => b.category === c.id).length, c.id).toBeGreaterThanOrEqual(3);
  });

  it("promises nothing on the first run's language screen, and says what the phone really does", async () => {
    const { tonguesNote } = await import("@/lib/onboarding/tongues");
    const { translate } = await import("@/lib/i18n");
    const t = (id: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(null, id, vars);
    // The reader asks the phone's own translator for a tapped word's meaning in the reader's language (useSentenceMeaning),
    // and falls back to English where it cannot: so neither "coming" nor a flat "shown in English".
    const note = tonguesNote(t, "en", "fr", "en");
    expect(note).toBe("Word meanings appear in French when your phone can translate them, and in English when it can't.");
    expect(note).not.toMatch(/soon|coming|for now/i);
  });
});

import { describe, expect, it } from "vitest";
import { levelOrder, orderBooks } from "@/lib/translate/queue";
import { cacheKey, clearCached, getCached, hasCached, setCached } from "@/lib/translate/cache";

describe("the order the library is translated in", () => {
  const books = [
    { slug: "a", category: "crime", pages: 50 },
    { slug: "b", category: "romance", pages: 200 },
    { slug: "c", category: "crime", pages: 200 },
    { slug: "d", category: "romance", pages: 50 },
  ];
  it("puts the liked shelves first, full books before short ones, library order inside each group", () => {
    expect(orderBooks(books, ["romance"])).toEqual(["b", "d", "c", "a"]);
    expect(orderBooks(books, [])).toEqual(["b", "c", "a", "d"]);
  });
  it("does the reader's level first, then the nearest", () => {
    expect(levelOrder("A2")).toEqual(["a1a2", "b1b2", "c1c2"]);
    expect(levelOrder("B1")).toEqual(["b1b2", "a1a2", "c1c2"]);
    expect(levelOrder("C2")).toEqual(["c1c2", "b1b2", "a1a2"]);
    expect(levelOrder(null)).toEqual(["a1a2", "b1b2", "c1c2"]);
  });
});

describe("translations kept on the phone", () => {
  it("keeps, finds and forgets a book (in memory when there is no IndexedDB)", async () => {
    const key = cacheKey("persuasion", "a1a2", "es");
    expect(key).toBe("persuasion/a1a2/es");
    expect(await hasCached(key)).toBe(false);
    await setCached(key, { pages: ["uno", "dos"], speak: "en" });
    expect(await hasCached(key)).toBe(true);
    expect((await getCached(key))?.pages).toEqual(["uno", "dos"]);
    await clearCached();
    expect(await getCached(key)).toBeNull();
  });
});

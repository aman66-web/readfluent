import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { finished, parseVersionKey, readHref, reading } from "@/lib/mine";

let path = "/";
vi.mock("next/navigation", () => ({ usePathname: () => path, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown } & Record<string, unknown>) => createElement("a", { href, ...rest }, children as never) }));

const render = async (at: string) => {
  path = at;
  const { TabBar } = await import("@/components/TabBar");
  return renderToStaticMarkup(createElement(TabBar));
};

describe("the menu", () => {
  it("has the four tabs of the app it came from, named for reading, in order", async () => {
    const html = await render("/");
    const labels = [...html.matchAll(/<span class="line-clamp-2 max-w-full break-words px-0.5 text-center text-[10.5px] leading-[1.1]">([^<]+)<\/span>/g)].map((m) => m[1]);
    expect(labels).toEqual(["Home", "Library", "Recall", "My books"]);
    expect([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(["/", "/library", "/recall", "/mine"]);
  });

  it("marks the tab that is open, and a book page counts as the library", async () => {
    const open = async (at: string) => [...(await render(at)).matchAll(/<a href="([^"]+)"[^>]*aria-current="page"/g)].map((m) => m[1]);
    expect(await open("/")).toEqual(["/"]);
    expect(await open("/library")).toEqual(["/library"]);
    expect(await open("/book/pride-and-prejudice")).toEqual(["/library"]);
    expect(await open("/recall")).toEqual(["/recall"]);
    expect(await open("/mine")).toEqual(["/mine"]);
  });

  it("is not shown on the first run, the placement test, the reader, offline or privacy", async () => {
    for (const at of ["/welcome", "/placement", "/read/pride-and-prejudice/a1a2/50", "/offline", "/privacy"]) expect(await render(at), at).toBe("");
    for (const at of ["/", "/library", "/book/pride-and-prejudice", "/languages"]) expect(await render(at), at).not.toBe("");
  });
});

describe("my books", () => {
  it("reads a version's key back into book, level and length", () => {
    expect(parseVersionKey("pride-and-prejudice/B1B2-100")).toEqual({ slug: "pride-and-prejudice", level: "B1B2", length: 100 });
    expect(parseVersionKey("nonsense")).toBeNull();
  });

  it("lists versions started and not finished, newest first, with the page they are on", () => {
    const list = reading({ "pride-and-prejudice/A1A2-50": 3, "pride-and-prejudice/B1B2-100": 7 }, ["pride-and-prejudice/A1A2-50"]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ levelLabel: "B1–B2", length: 100, page: 8 });
    expect(list[0].total).toBeGreaterThan(0);
    expect(readHref(list[0])).toBe("/read/pride-and-prejudice/b1b2/100");
  });

  it("lists finished versions with a full bar, and leaves out books that are not in the library", () => {
    const done = finished(["pride-and-prejudice/A1A2-50", "gone-book/A1A2-50", "pride-and-prejudice/XX-50"]);
    expect(done).toHaveLength(1);
    expect(done[0].page).toBe(done[0].total);
    expect(reading({ "gone-book/A1A2-50": 2 }, [])).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CACHE_PREFIX } from "@/lib/brand";

/**
 * The service worker is a plain file the app never imports, so nothing else in
 * this suite would notice it going wrong. These are the claims it makes that
 * the product also makes out loud (CLAUDE.md, "Offline").
 */
const sw = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

describe("the service worker", () => {
  it("caches every image type the app actually ships", () => {
    for (const ext of ["svg", "png", "webp", "woff2?"]) {
      expect(sw, `${ext} is not cached`).toContain(ext);
    }
    const m = /\/\\\.\(([^)]+)\)\$\//.exec(sw);
    expect(m, "the asset pattern moved").toBeTruthy();
    expect(m![1].split("|")).toContain("webp");
  });

  it("never caches an API answer", () => {
    // A sign-in or a purchase served from yesterday is worse than an error.
    expect(sw).toContain('url.pathname.startsWith("/api/")');
  });

  it("goes to the network first for a page", () => {
    // Served stale-first, a phone opened the previous deploy for a whole visit
    // and a change looked like it had not shipped.
    expect(sw).toContain("NAV_TIMEOUT_MS");
  });

  it("names its caches with the brand's prefix, so tidy-up only ever touches its own", () => {
    expect(sw).toContain(`const PREFIX = "${CACHE_PREFIX}";`);
  });

  it("leaves downloaded versions alone when it drops an old shell", () => {
    // M9 keeps a download in its own bucket under this namespace. A deploy must
    // never delete somebody's downloads.
    expect(sw).toContain("const DOWNLOAD_PREFIX = `${PREFIX}dl-`;");
    expect(sw).toMatch(/name\.startsWith\(DOWNLOAD_PREFIX\)\) return undefined/);
  });

  it("stores only the shell: nothing persists unless the reader downloads it", () => {
    // Pages are written only for paths in SHELL, assets only if hashed or in
    // SHELL, and cross-origin requests (books, photos, audio) are not touched.
    expect(sw).toContain("const store = inShell(url.pathname);");
    expect(sw).toMatch(/\(hashed \|\| inShell\(url\.pathname\)\)/);
    expect(sw).toContain("url.origin !== self.location.origin) return false");
  });

  it("carries nothing from the app it was adapted from", () => {
    expect(sw).not.toMatch(/diagram|voice|\/books\/|book-|lines\.json/i);
  });
});

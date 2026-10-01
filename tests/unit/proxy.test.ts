import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");
const m = /matcher:\s*\[\s*(?:\/\*[\s\S]*?\*\/\s*)?"([^"]+)"/.exec(src);
const re = new RegExp(`^${m![1].replace(/\\\\/g, "\\")}$`);

describe("which requests the proxy runs on", () => {
  it("runs on pages", () => {
    for (const p of ["/", "/welcome", "/library", "/book/pride-and-prejudice", "/read/pride-and-prejudice/a1a2/50", "/apple"]) expect(re.test(p), p).toBe(true);
  });

  it("leaves static files, the API, the sign-in callback, the worker and the manifest alone, so none of them makes a user", () => {
    for (const p of ["/_next/static/x.js", "/api/health", "/api/revenuecat/webhook", "/auth/callback", "/sw.js", "/manifest.webmanifest", "/robots.txt", "/icon.svg", "/favicon.ico", "/.well-known/assetlinks.json"]) expect(re.test(p), p).toBe(false);
  });

  it("signs somebody in anonymously only when they open a page", () => {
    expect(src).toContain('"sec-fetch-mode") === "navigate"');
    expect(src).toContain('"sec-fetch-dest") === "document"');
  });

  it("re-sets the first-screen cookie from the server, which WebKit does not expire after a week", () => {
    expect(src).toContain("ONBOARDED_MAX_AGE");
  });
});

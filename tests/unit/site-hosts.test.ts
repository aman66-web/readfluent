import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKETING_HOSTS, SITE_PAGE, hasAppSession, isMarketingHost, isSitePath, marketingHosts, normalHost, sitePage,
} from "@/lib/site/hosts";

/**
 * The marketing site takes the root of its own domain and nothing else
 * (lib/site/hosts.ts). Get this wrong one way and the app's own address
 * shows an advert instead of the library; the other way and the domain somebody
 * typed shows a sign-in they never asked for.
 */
const DOMAINS = ["readfluent.example", "www.readfluent.example"];
const hosts = marketingHosts(DOMAINS.join(","));

describe("marketing hosts", () => {
  it("has no default domain: no host is a marketing host until MARKETING_HOSTS says so", () => {
    expect(DEFAULT_MARKETING_HOSTS).toEqual([]);
    expect(marketingHosts(undefined)).toEqual([]);
    expect(marketingHosts("")).toEqual([]);
    expect(marketingHosts(" , ")).toEqual([]);
    expect(sitePage({ host: "readfluent.example", pathname: "/" }, marketingHosts(undefined))).toBeNull();
  });

  it("reads the domains from MARKETING_HOSTS", () => {
    expect(hosts).toEqual(DOMAINS);
  });

  it("reads MARKETING_HOSTS as a comma-separated list, tidied", () => {
    expect(marketingHosts("Example.com, www.example.com:443 ,")).toEqual(["example.com", "www.example.com"]);
  });

  it("matches a Host header whatever its case, port or trailing dot", () => {
    expect(normalHost("ReadFluent.example:3000")).toBe("readfluent.example");
    expect(normalHost("www.readfluent.example.")).toBe("www.readfluent.example");
    expect(isMarketingHost("readfluent.example", hosts)).toBe(true);
    expect(isMarketingHost("WWW.READFLUENT.EXAMPLE:443", hosts)).toBe(true);
  });

  it("is not the app's own addresses", () => {
    for (const h of ["readfluent.vercel.app", "localhost:3000", "127.0.0.1", "", null, undefined]) {
      expect(isMarketingHost(h, hosts)).toBe(false);
    }
    // Not a suffix match: a subdomain is somewhere else.
    expect(isMarketingHost("app.readfluent.example", hosts)).toBe(false);
    expect(isMarketingHost("evilreadfluent.example", hosts)).toBe(false);
  });
});

describe("which requests get the site", () => {
  it("the root of a marketing host", () => {
    expect(sitePage({ host: "readfluent.example", pathname: "/" }, hosts)).toBe(SITE_PAGE);
    expect(sitePage({ host: "www.readfluent.example", pathname: "/" }, hosts)).toBe("/site/index.html");
  });

  it("never the root of the app's own address", () => {
    expect(sitePage({ host: "readfluent.vercel.app", pathname: "/" }, hosts)).toBeNull();
    expect(sitePage({ host: "localhost:3000", pathname: "/" }, hosts)).toBeNull();
  });

  it("never any other path, so the web app still works on the marketing domain", () => {
    for (const p of ["/privacy", "/library", "/read/pride-and-prejudice", "/api/health", "/index.html", "//"]) {
      expect(sitePage({ host: "readfluent.example", pathname: p }, hosts)).toBeNull();
    }
  });

  it("not for somebody already using the web app there", () => {
    expect(sitePage({ host: "readfluent.example", pathname: "/", hasSession: true }, hosts)).toBeNull();
  });

  it("knows a Supabase session cookie, split or whole, from anything else", () => {
    expect(hasAppSession(["sb-abcdefgh-auth-token"])).toBe(true);
    expect(hasAppSession(["theme", "sb-abcdefgh-auth-token.0", "sb-abcdefgh-auth-token.1"])).toBe(true);
    expect(hasAppSession([])).toBe(false);
    expect(hasAppSession(["sb-abcdefgh-auth-token-code-verifier", "_ga", "session"])).toBe(false);
  });

  it("treats the site's own files as the site's, on any host", () => {
    expect(isSitePath("/site")).toBe(true);
    expect(isSitePath("/site/index.html")).toBe(true);
    expect(isSitePath("/site/assets/hero.mp4")).toBe(true);
    expect(isSitePath("/sitemap.xml")).toBe(false);
    expect(isSitePath("/")).toBe(false);
  });
});

describe("the proxy", () => {
  const src = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");

  it("sends the marketing root to the site before any Supabase work", () => {
    const rewrite = src.indexOf("NextResponse.rewrite(");
    expect(rewrite, "the proxy no longer rewrites to the site").toBeGreaterThan(-1);
    expect(rewrite).toBeLessThan(src.indexOf("dbConfigured()", src.indexOf("export async function proxy")));
    expect(rewrite).toBeLessThan(src.indexOf("await refresh("));
  });

  it("leaves the site's own files alone, so fetching them signs nobody in", () => {
    const skip = src.indexOf("isSitePath(");
    expect(skip).toBeGreaterThan(-1);
    expect(skip).toBeLessThan(src.indexOf("await refresh("));
  });

  it("runs on the root, which the matcher must not skip", () => {
    const m = /matcher:\s*\[\s*(?:\/\*[\s\S]*?\*\/\s*)?"([^"]+)"/.exec(src);
    expect(m, "the matcher is not where it was").not.toBeNull();
    const re = new RegExp(`^${m![1].replace(/\\\\/g, "\\")}$`);
    expect(re.test("/")).toBe(true);
    expect(re.test("/welcome")).toBe(true);
  });
});

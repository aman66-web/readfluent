import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ONBOARDED_COOKIE, WELCOME_PATH, needsOnboarding } from "@/lib/onboarding";

describe("who is sent to the first screen", () => {
  it("a new visitor at the front door", () => {
    expect(needsOnboarding("/", false)).toBe(true);
  });

  it("not somebody who has been through it", () => {
    expect(needsOnboarding("/", true)).toBe(false);
  });

  it("never a deep link, so a shared book or page opens where it points", () => {
    for (const p of ["/book/pride-and-prejudice", "/read/pride-and-prejudice/b1b2/50", "/privacy", "/offline", "/api/health", "/welcome", "/auth/callback"]) {
      expect(needsOnboarding(p, false), p).toBe(false);
    }
  });

  it("is hooked into the proxy, before any session work, and sends people to the welcome path", () => {
    const proxy = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");
    expect(proxy).toContain("needsOnboarding(pathname, request.cookies.has(ONBOARDED_COOKIE))");
    expect(proxy).toContain("new URL(WELCOME_PATH, request.url)");
    expect(proxy.indexOf("needsOnboarding(")).toBeLessThan(proxy.indexOf("dbConfigured()"));
    expect(WELCOME_PATH).toBe("/welcome");
    expect(ONBOARDED_COOKIE).toBe("rf_onboarded");
  });
});

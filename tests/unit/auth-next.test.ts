import { describe, expect, it } from "vitest";
import { CALLBACK_PATH, SIGN_IN_FAILED, callbackUrl, safeNext } from "@/lib/auth/next";

describe("where a sign-in may go next", () => {
  it("keeps a path on this site", () => {
    expect(safeNext("/library")).toBe("/library");
    expect(safeNext("/read/pride-and-prejudice?page=3")).toBe("/read/pride-and-prejudice?page=3");
  });

  it("replaces anything that would leave it with the home screen: no open redirect", () => {
    for (const bad of [null, undefined, "", "library", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/\t/evil.example", "/\n/evil.example", "/\r\n/evil.example", "/a\\b"]) {
      expect(safeNext(bad), String(bad)).toBe("/");
    }
  });

  it("builds the callback the provider returns to, with next encoded and checked", () => {
    expect(callbackUrl("https://host.example", "/library")).toBe(`https://host.example${CALLBACK_PATH}?next=%2Flibrary`);
    expect(callbackUrl("https://host.example///", "/a?b=c")).toBe(`https://host.example${CALLBACK_PATH}?next=%2Fa%3Fb%3Dc`);
    expect(callbackUrl("https://host.example", "//evil.example")).toBe(`https://host.example${CALLBACK_PATH}?next=%2F`);
  });

  it("lands a failed sign-in where the page says so", () => {
    expect(SIGN_IN_FAILED).toBe("/?error=auth");
  });
});

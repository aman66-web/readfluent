import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NAME_MAX, NO_ANSWERS, parseAnswers } from "@/lib/onboarding/answers";
import { isOurKey } from "@/lib/store/wipe";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown } & Record<string, unknown>) => createElement("a", { href, ...rest }, children as never) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, replace() {} }), usePathname: () => "/me", useSearchParams: () => new URLSearchParams() }));

const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the name", () => {
  it("is kept tidy, one line, and no longer than it may be", () => {
    expect(parseAnswers(JSON.stringify({ name: "  Ana   María  " })).name).toBe("Ana María");
    expect(parseAnswers(JSON.stringify({ name: "x".repeat(500) })).name).toHaveLength(NAME_MAX);
    expect(parseAnswers(JSON.stringify({ name: 42 })).name).toBe("");
    expect(NO_ANSWERS.name).toBe("");
  });
});

describe("what is wiped", () => {
  it("is every key the app wrote and nothing else", () => {
    expect(isOurKey("readfluent.onboarding.v1")).toBe(true);
    expect(isOurKey("readfluent.xp.v1")).toBe(true);
    expect(isOurKey("sb-project-auth-token")).toBe(false);
    expect(isOurKey("other.app.key")).toBe(false);
  });
});

describe("the profile button", () => {
  it("opens the profile, and says so for a screen reader", async () => {
    const { ProfileButton } = await import("@/components/home/ProfileButton");
    const html = renderToStaticMarkup(createElement(ProfileButton));
    expect(html).toContain('href="/me"');
    expect(html).toContain('aria-label="Open your profile"');
  });
});

describe("the profile screen", () => {
  it("has the name, how they are learning, the account and the way out, and an About", async () => {
    const { ProfileView } = await import("@/components/me/ProfileView");
    const t = text(renderToStaticMarkup(createElement(ProfileView)));
    for (const s of ["Profile", "Your name", "Not signed in", "Learning", "Languages", "Your level", "A1.1", "Daily goal", "Shelves you like", "Account", "Delete my data on this device", "About", "Privacy Policy"]) {
      // "Not signed in" appears once the browser has asked; on the server the line is blank.
      if (s === "Not signed in") continue;
      expect(t, s).toContain(s);
    }
    // Nothing destructive is open until it is asked for.
    expect(t).not.toContain("Yes, delete everything");
  });
});

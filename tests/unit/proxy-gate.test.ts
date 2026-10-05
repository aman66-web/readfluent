import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** What the (mocked) auth service says about the cookie's session. */
let answer: { user: { is_anonymous: boolean } | null } | "down" = { user: null };
const signInAnonymously = vi.fn(async () => ({}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => { if (answer === "down") throw new Error("auth service down"); return { data: answer }; },
      signInAnonymously,
    },
  }),
}));

const { proxy } = await import("../../proxy");

const SESSION = "sb-abcdefgh-auth-token=x";
const open = (path: string, cookie = "", headers: Record<string, string> = {}) =>
  proxy(new NextRequest(`https://readfluent.test${path}`, { headers: { "sec-fetch-dest": "document", "sec-fetch-mode": "navigate", ...(cookie ? { cookie } : {}), ...headers } }));
const where = (r: Response) => (r.status >= 300 && r.status < 400 ? new URL(r.headers.get("location")!).pathname + new URL(r.headers.get("location")!).search : null);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  answer = { user: null };
  signInAnonymously.mockClear();
});

describe("the proxy keeps every page but the first run and the legal pages behind a real account", () => {
  it("sends a new device with no session at all to the start of the first run, from any page", async () => {
    for (const p of ["/", "/library", "/book/rome", "/read/rome/a1a2/50", "/me", "/paywall", "/recall/talk"]) expect(where(await open(p)), p).toBe("/welcome");
  });

  it("sends a device that has been through the first run (it has the cookie) to the sign-in itself", async () => {
    for (const p of ["/", "/library", "/read/rome/a1a2/50"]) expect(where(await open(p, "rf_onboarded=1")), p).toBe("/welcome?step=account");
  });

  it("does not let an anonymous session through (the one a phone with progress and no account has)", async () => {
    answer = { user: { is_anonymous: true } };
    for (const p of ["/library", "/book/rome", "/me"]) expect(where(await open(p, `${SESSION}; rf_onboarded=1`)), p).toBe("/welcome?step=account");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("lets a real account through", async () => {
    answer = { user: { is_anonymous: false } };
    for (const p of ["/library", "/book/rome", "/me", "/paywall"]) expect(where(await open(p, `${SESSION}; rf_onboarded=1`)), p).toBeNull();
  });

  it("sends a session the auth service no longer knows to the sign-in", async () => {
    answer = { user: null };
    expect(where(await open("/library", `${SESSION}; rf_onboarded=1`))).toBe("/welcome?step=account");
  });

  it("always opens the first run, the legal pages and the health page, with or without an account", async () => {
    for (const p of ["/welcome", "/welcome?step=account", "/privacy", "/terms", "/support", "/offline", "/health"]) {
      expect(where(await open(p)), p).toBeNull();
      expect(where(await open(p, `${SESSION}; rf_onboarded=1`)), p).toBeNull();
    }
  });

  it("still makes the anonymous session the first screens need, on the first run only", async () => {
    await open("/welcome", SESSION);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("does not ask for an account on a prefetch (only the real visit is held)", async () => {
    expect(where(await open("/library", "", { "next-router-prefetch": "1", "sec-fetch-dest": "empty" }))).toBeNull();
  });

  it("holds a background fetch of a page from a device with no session too", async () => {
    expect(where(await open("/library", "", { "sec-fetch-dest": "empty" }))).toBe("/welcome");
  });

  it("opens the page when the auth service cannot be asked, so reading offline does not depend on it", async () => {
    answer = "down";
    expect(where(await open("/library", `${SESSION}; rf_onboarded=1`))).toBeNull();
  });

  it("has no gate in a copy with no account service connected (local development)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(where(await open("/library", "rf_onboarded=1"))).toBeNull();
  });
});

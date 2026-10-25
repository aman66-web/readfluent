import { beforeEach, describe, expect, it, vi } from "vitest";

// A refused Sign in with Apple says why: the sign-in service's words, its code and its HTTP status, so the
// reason on the screen is the one the service gave and not only "didn't work" (the iOS 27 review, 20 Oct 2026).

const authorize = vi.fn();
const signInWithIdToken = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios", isPluginAvailable: (name: string) => name === "SignInWithApple" },
}));
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })) } }));
vi.mock("@capacitor/browser", () => ({
  Browser: { open: vi.fn(), close: vi.fn(), addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })) },
}));
vi.mock("@capacitor-community/apple-sign-in", () => ({
  SignInWithApple: { authorize: (...args: unknown[]) => authorize(...args) },
}));
vi.mock("@/lib/db/client", () => ({
  createClient: () => ({ auth: { signInWithIdToken: (...args: unknown[]) => signInWithIdToken(...args) } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as { window?: unknown }).window = {
    setTimeout,
    clearTimeout,
    location: { origin: "https://readfluent.example", href: "", assign: vi.fn() },
    open: vi.fn(),
  };
});

describe("a refused Apple sign-in says why", () => {
  it("passes the service's words, code and HTTP status back", async () => {
    authorize.mockResolvedValueOnce({ response: { identityToken: "aaa.bbb.ccc" } });
    signInWithIdToken.mockResolvedValueOnce({ error: { message: "Provider is not enabled", code: "provider_disabled", status: 400 } });
    const { signInNative } = await import("@/lib/auth/native");
    expect(await signInNative("apple", "/library")).toBe("apple: Provider is not enabled (code provider_disabled, HTTP 400)");
  });

  it("still says something when the service gives no words", async () => {
    authorize.mockResolvedValueOnce({ response: { identityToken: "aaa.bbb.ccc" } });
    signInWithIdToken.mockResolvedValueOnce({ error: {} });
    const { signInNative } = await import("@/lib/auth/native");
    expect(await signInNative("apple", "/library")).toBe("apple: rejected");
  });

  it("succeeds without a reason when the service accepts the token", async () => {
    authorize.mockResolvedValueOnce({ response: { identityToken: "aaa.bbb.ccc" } });
    signInWithIdToken.mockResolvedValueOnce({ error: null });
    const { signInNative, SIGNED_IN } = await import("@/lib/auth/native");
    expect(await signInNative("apple", "/library")).toBe(SIGNED_IN);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { STEP_IDS, nextStepAfter } from "@/lib/onboarding/steps";

// Two defects the post-login audit (25 Oct 2026) confirmed on the iPhone: signing in early sent the reader back
// to the sign-in screen at Pledge (the phone skips "home", so the rule that skipped sign-in was never reached);
// and a reader's first visit to Friends could clash with itself (two league calls at once, duplicate key).

const at = (id: string) => STEP_IDS.indexOf(id as (typeof STEP_IDS)[number]);

describe("the step after Continue", () => {
  it("skips the home-screen step inside the phone app, and nowhere else", () => {
    expect(nextStepAfter(at("pledge"), false, false)).toBe(at("home"));
    expect(nextStepAfter(at("pledge"), true, false)).toBe(at("account"));
  });

  it("does not show the sign-in again once someone has signed in early, on the phone", () => {
    expect(nextStepAfter(at("pledge"), true, true)).toBe(at("interests"));
  });

  it("does not show the sign-in again once signed in early, on the web either", () => {
    expect(nextStepAfter(at("home"), false, true)).toBe(at("interests"));
  });

  it("still shows the sign-in to somebody who has not signed in", () => {
    expect(nextStepAfter(at("home"), false, false)).toBe(at("account"));
  });

  it("moves one step for every other step", () => {
    expect(nextStepAfter(0, false, false)).toBe(1);
    expect(nextStepAfter(at("interests"), true, true)).toBe(at("heard"));
  });
});

const rpc = vi.fn();
vi.mock("@/lib/db/client", () => ({ createClient: () => ({ rpc: (...args: unknown[]) => rpc(...args) }) }));

describe("the league's week and month, asked for at the same time", () => {
  beforeEach(() => { rpc.mockReset(); });

  it("asks again when two calls clash on the same league row", async () => {
    const { myBoard } = await import("@/lib/social/api");
    rpc
      .mockResolvedValueOnce({ data: null, error: { message: 'duplicate key value violates unique constraint "league_members_pkey"', code: "23505" } })
      .mockResolvedValueOnce({ data: null, error: null });
    await expect(myBoard("week")).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("still reports any other failure", async () => {
    const { myBoard } = await import("@/lib/social/api");
    rpc.mockResolvedValueOnce({ data: null, error: { message: "something else broke", code: "XX000" } });
    await expect(myBoard("week")).rejects.toThrow("something else broke");
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

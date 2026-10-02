import { describe, expect, it } from "vitest";
import { cheerFor, milestoneFor } from "@/components/onboarding/Guide";

describe("Dewey's cheers", () => {
  it("says something different on the first few taps", () => {
    const said = new Set([1, 2, 3, 4].map((n) => cheerFor(n, 2, 18)));
    expect(said.size).toBe(4);
  });
  it("says it is nearly over towards the end", () => {
    expect(cheerFor(2, 16, 18)).toBe("cheer.almost");
    expect(cheerFor(1, 16, 18)).not.toBe("cheer.almost");
  });
  it("cheers on its own at the half and near the end of a long run, not a short one", () => {
    expect(milestoneFor(9, 18)).toBe("cheer.half");
    expect(milestoneFor(15, 18)).toBe("cheer.almost");
    expect(milestoneFor(3, 18)).toBeNull();
    expect(milestoneFor(2, 5)).toBeNull();
  });
});

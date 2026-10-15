import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Apple allows three looks for its sign-in button (black, white, white with outline); ours is the black one, so it must not slide back to the outlined style. */
describe("the Continue with Apple button", () => {
  const tsx = readFileSync("components/onboarding/SignIn.tsx", "utf8");
  const css = readFileSync("app/welcome/welcome.css", "utf8");

  it("uses the black style, Google's keeps the outline", () => {
    expect(tsx).toContain('provider === "apple" ? "ob-apple" : "ob-quiet"');
  });

  it("is pure black with a white mark and white text", () => {
    expect(css).toMatch(/\.ob-apple\s*\{\s*background:\s*#000;\s*color:\s*#fff;\s*\}/);
  });
});

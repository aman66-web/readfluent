import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("found by walking the app on an iPhone simulator (6 Oct 2026)", () => {
  it("does not ask the installed app to be added to the home screen", () => {
    // The step is for a web visitor; inside the app (Capacitor) the first run goes from the promise straight to the sign-in.
    const welcome = read("components/welcome/Welcome.tsx");
    expect(welcome).toContain('STEP_IDS[i + 1] === "home" && onNativeShell() ? i + 2 : i + 1');
  });

  it("gives the reader's 'download the language' screen a way out", () => {
    // It used to be a dead end: one button, no way back, for somebody who will not (or cannot) download.
    const reader = read("components/Reader.tsx");
    const screen = reader.slice(reader.indexOf('made.state === "download"'), reader.indexOf("const notice"));
    expect(screen).toContain("<BackLink");
    expect(screen).toContain('t("reader.backBook")');
  });
});

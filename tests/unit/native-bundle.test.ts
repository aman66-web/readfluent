import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LIMIT_BYTES, checkBundle, ignored, patternsOf, webDirOf } from "../../scripts/check-native-bundle.mjs";

/**
 * The app this project's engineering was adapted from shipped a 239 MB
 * audio folder into every native build for months: `webDir` was `public/` and
 * there was no `.capacitorignore`. ReadFluent's content is far larger, so the
 * guard is checked against the real project and against deliberately broken
 * ones — a check that has never failed has not been shown to work.
 */
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

function project(opts: { webDir: string; ignore?: string | null; files: Record<string, string | number> }) {
  const root = mkdtempSync(join(tmpdir(), "rf-bundle-"));
  dirs.push(root);
  writeFileSync(join(root, "capacitor.config.ts"), `const c = {\n  webDir: "${opts.webDir}",\n};\nexport default c;\n`);
  if (opts.ignore !== null) writeFileSync(join(root, ".capacitorignore"), opts.ignore ?? GOOD_IGNORE);
  for (const [rel, body] of Object.entries(opts.files)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, typeof body === "number" ? Buffer.alloc(body) : body);
  }
  return root;
}

const GOOD_IGNORE = "content/\nbooks/\nphotos/\naudio/\nvoice/\n*.mp3\n*.m4a\n*.mp4\n";

describe("the real project", () => {
  it("passes: a thin shell, a stub webDir and an ignore file", () => {
    const { problems, bytes } = checkBundle(process.cwd());
    expect(problems).toEqual([]);
    expect(bytes).toBeLessThan(LIMIT_BYTES);
  });
});

describe("the check itself", () => {
  it("fails when webDir is public/, which is how the 239 MB got in", () => {
    const root = project({ webDir: "public", files: { "public/index.html": "x", "public/voice/a.mp3": 10 } });
    expect(checkBundle(root).problems.join("\n")).toMatch(/webDir is "public"/);
  });

  it("fails when there is no .capacitorignore", () => {
    const root = project({ webDir: "shell", ignore: null, files: { "shell/index.html": "x" } });
    expect(checkBundle(root).problems).toContain(".capacitorignore is missing");
  });

  it("fails when the ignore file forgets a content directory", () => {
    const root = project({ webDir: "shell", ignore: "*.mp3\n*.m4a\n*.mp4\n", files: { "shell/index.html": "x" } });
    const p = checkBundle(root).problems.join("\n");
    expect(p).toMatch(/does not list "audio\/"/);
    expect(p).toMatch(/does not list "content\/"/);
  });

  it("fails on media that the ignore file does not cover", () => {
    const root = project({ webDir: "shell", files: { "shell/index.html": "x", "shell/x.wav": 100 } });
    expect(checkBundle(root).problems.join("\n")).toMatch(/x\.wav is media/);
  });

  it("ignores what the ignore file lists and does not count it", () => {
    const root = project({ webDir: "shell", files: { "shell/index.html": "x", "shell/audio/a.mp3": 5 * 1024 * 1024, "shell/n.m4a": 99 } });
    const r = checkBundle(root);
    expect(r.problems).toEqual([]);
    expect(r.files).toBe(1);
  });

  it("fails when what is left is over the limit", () => {
    const root = project({ webDir: "shell", files: { "shell/index.html": "x", "shell/big.bin": LIMIT_BYTES + 1 } });
    expect(checkBundle(root).problems.join("\n")).toMatch(/over the 2 MB limit/);
  });

  it("fails when the Capacitor CLI would have no index.html", () => {
    const root = project({ webDir: "shell", files: { "shell/other.html": "x" } });
    expect(checkBundle(root).problems.join("\n")).toMatch(/index\.html is missing/);
  });

  it("reads webDir and the patterns, and matches the way the file says", () => {
    expect(webDirOf('const c = {\n  webDir: "native-shell",\n}')).toBe("native-shell");
    expect(patternsOf("# c\n\ncontent/\n  *.mp3  \n")).toEqual(["content/", "*.mp3"]);
    expect(ignored("a/audio/b.txt", ["audio/"])).toBe(true);
    expect(ignored("audio", ["audio/"])).toBe(false); // a file named audio is not the directory
    expect(ignored("a/B.MP3", ["*.mp3"])).toBe(true);
    expect(ignored("a/b.txt", ["*.mp3", "audio/"])).toBe(false);
  });
});

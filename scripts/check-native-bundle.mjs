#!/usr/bin/env node
/**
 * Fails if what `cap sync` would copy into a native build is more than a thin
 * shell.
 *
 * The app this project's engineering was adapted from set `webDir` to
 * `public/` and had no `.capacitorignore`, so a 239 MB audio folder was
 * bundled into every native build for months. ReadFluent's content is far
 * larger, so the guard has layers, each checked here:
 *
 *   1. `webDir` must not be `public` (or the project root, or a parent).
 *   2. `.capacitorignore` must exist and list the content directories and media
 *      extensions.
 *   3. What is left in `webDir` after the ignore file is applied must be under
 *      the limit, and must hold no media at all.
 *
 *   node scripts/check-native-bundle.mjs
 *
 * If this fails, fix the cause. Do not raise the limit (CLAUDE.md).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

export const LIMIT_BYTES = 2 * 1024 * 1024;

/** The patterns every ReadFluent .capacitorignore must carry. */
export const REQUIRED_IGNORES = ["content/", "audio/", "photos/", "books/", "voice/", "*.mp3", "*.m4a", "*.mp4"];

const MEDIA = new Set([".mp3", ".m4a", ".wav", ".ogg", ".opus", ".aac", ".flac", ".mp4", ".mov", ".webm"]);

/** `webDir` as written in capacitor.config.ts. */
export function webDirOf(configSource) {
  const m = /^\s*webDir:\s*["']([^"']+)["']/m.exec(configSource);
  return m ? m[1] : null;
}

/** The non-comment, non-blank lines of a .capacitorignore. */
export function patternsOf(source) {
  return source.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

/** Whether one path (relative to webDir, `/`-separated) is ignored by the patterns. */
export function ignored(rel, patterns) {
  const parts = rel.split("/");
  const name = parts[parts.length - 1];
  return patterns.some((p) => {
    if (p.endsWith("/")) return parts.slice(0, -1).includes(p.slice(0, -1));
    if (p.startsWith("*.")) return name.toLowerCase().endsWith(p.slice(1).toLowerCase());
    return parts.includes(p);
  });
}

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push({ rel: relative(base, full).split(sep).join("/"), size: statSync(full).size });
  }
  return out;
}

/** Returns `{ problems: string[], bytes: number, files: number }` for the project at `root`. */
export function checkBundle(root) {
  const problems = [];
  const configPath = join(root, "capacitor.config.ts");
  if (!existsSync(configPath)) return { problems: ["capacitor.config.ts is missing"], bytes: 0, files: 0 };

  const webDir = webDirOf(readFileSync(configPath, "utf8"));
  if (!webDir) problems.push("capacitor.config.ts has no webDir");
  else if (["public", ".", "./", "", "/"].includes(webDir.replace(/\/+$/, "")) || webDir.startsWith("..")) {
    problems.push(`webDir is "${webDir}": it must be a small dedicated folder (native-shell), never public/ or the project root`);
  }

  const ignorePath = join(root, ".capacitorignore");
  let patterns = [];
  if (!existsSync(ignorePath)) problems.push(".capacitorignore is missing");
  else {
    patterns = patternsOf(readFileSync(ignorePath, "utf8"));
    for (const need of REQUIRED_IGNORES) {
      if (!patterns.includes(need)) problems.push(`.capacitorignore does not list "${need}"`);
    }
  }

  let bytes = 0;
  let files = 0;
  const dir = webDir ? join(root, webDir) : null;
  if (dir && existsSync(dir) && !problems.some((p) => p.startsWith("webDir is"))) {
    if (!existsSync(join(dir, "index.html"))) problems.push(`${webDir}/index.html is missing (the Capacitor CLI needs it)`);
    for (const f of walk(dir)) {
      if (ignored(f.rel, patterns)) continue;
      files++;
      bytes += f.size;
      if (MEDIA.has(extname(f.rel).toLowerCase())) problems.push(`${webDir}/${f.rel} is media and would be bundled`);
    }
    if (bytes > LIMIT_BYTES) problems.push(`the bundle would be ${(bytes / 1024 / 1024).toFixed(1)} MB, over the ${LIMIT_BYTES / 1024 / 1024} MB limit`);
  } else if (dir && !existsSync(dir)) {
    problems.push(`webDir "${webDir}" does not exist`);
  }
  return { problems, bytes, files };
}

if (process.argv[1] && basename(process.argv[1]) === "check-native-bundle.mjs") {
  const root = join(fileURLToPath(import.meta.url), "..", "..");
  const { problems, bytes, files } = checkBundle(root);
  if (problems.length) {
    console.error("check-native-bundle FAILED:\n" + problems.map((p) => `  - ${p}`).join("\n"));
    process.exit(1);
  }
  console.log(`check-native-bundle ok: ${files} file(s), ${(bytes / 1024).toFixed(1)} KB would be bundled`);
}

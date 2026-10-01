import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Files on disk are the state of the run: a piece that exists is finished, so a run can stop and resume. */
export function readJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, "utf8")) as T; } catch { return null; }
}

/** Written whole or not at all: a crash never leaves half a file that a resume would trust. */
export function writeJson(file: string, value: unknown, pretty = true): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, pretty ? 2 : 0));
  renameSync(tmp, file);
}

export interface Paths { content: string; dictionary: string; reports: string; review: string; work: string }
export const DEFAULT_PATHS: Paths = { content: "content", dictionary: "dictionary", reports: "reports", review: "review", work: ".pipeline-work" };

export const bookWork = (p: Paths, id: string, ...rest: string[]): string => join(p.work, id, ...rest);

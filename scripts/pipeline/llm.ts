import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { EFFORT, MODEL } from "./config";
import { readJson, writeJson } from "./store";
import type { Usage } from "./types";

export type Stage = keyof typeof EFFORT;

export interface LlmRequest {
  /** Unique within a run: "pride-and-prejudice/A/03". */
  id: string;
  stage: Stage;
  book: string;
  /** System blocks. A block with `cache` is the stable part that many requests share. */
  system: { text: string; cache?: boolean }[];
  user: string;
  schema: Record<string, unknown>;
  maxTokens: number;
}

export interface LlmResult {
  id: string;
  json: unknown | null;
  usage: Usage;
  batch: boolean;
  /** Why there is no json: "refusal", "truncated", "bad-json", or an API error message. */
  error?: string;
}

export interface Executor {
  readonly batch: boolean;
  run(requests: LlmRequest[], key?: string): Promise<LlmResult[]>;
}

const NO_JSON = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

function parseMessage(id: string, msg: { content: { type: string; text?: string }[]; stop_reason: string | null; usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null } }, batch: boolean): LlmResult {
  const usage: Usage = {
    input: msg.usage.input_tokens, output: msg.usage.output_tokens,
    cacheRead: msg.usage.cache_read_input_tokens ?? 0, cacheWrite: msg.usage.cache_creation_input_tokens ?? 0,
  };
  if (msg.stop_reason === "refusal") return { id, json: null, usage, batch, error: "refusal" };
  if (msg.stop_reason === "max_tokens") return { id, json: null, usage, batch, error: "truncated" };
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  try { return { id, json: JSON.parse(text), usage, batch }; } catch { return { id, json: null, usage, batch, error: "bad-json" }; }
}

function params(r: LlmRequest) {
  return {
    model: MODEL,
    max_tokens: r.maxTokens,
    system: r.system.map((b) => (b.cache ? { type: "text" as const, text: b.text, cache_control: { type: "ephemeral" as const, ttl: "1h" as const } } : { type: "text" as const, text: b.text })),
    messages: [{ role: "user" as const, content: r.user }],
    // Thinking is always on for this model; effort is the only dial.
    output_config: { effort: EFFORT[r.stage], format: { type: "json_schema" as const, schema: r.schema } },
  };
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) { const i = next++; if (i >= items.length) return; out[i] = await fn(items[i]); }
  }));
  return out;
}

/** One request at a time per worker, streamed (the SDK needs streaming for long outputs). A policy refusal is retried by the API itself on a fallback model. */
export class SyncExecutor implements Executor {
  readonly batch = false;
  constructor(private client: Anthropic, private concurrency = 4) {}
  async run(requests: LlmRequest[]): Promise<LlmResult[]> {
    return pool(requests, this.concurrency, async (r) => {
      try {
        const stream = this.client.beta.messages.stream({ ...params(r), betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
        return parseMessage(r.id, await stream.finalMessage(), false);
      } catch (e) {
        return { id: r.id, json: null, usage: NO_JSON, batch: false, error: e instanceof Error ? e.message : String(e) };
      }
    });
  }
}

/** The Message Batches API: half price, results within an hour or so. Remembers the batch on disk so a stopped run picks the same batch up again. */
export class BatchExecutor implements Executor {
  readonly batch = true;
  constructor(private client: Anthropic, private stateDir: string, private pollMs = 30_000) {}
  async run(requests: LlmRequest[], key = "batch"): Promise<LlmResult[]> {
    if (requests.length === 0) return [];
    const stateFile = `${this.stateDir}/batch-${key}.json`;
    const ids = requests.map((_, i) => `r${i}`);
    let state = readJson<{ batchId: string; ids: string[] }>(stateFile);
    if (!state || state.ids.length !== requests.length || state.ids.some((x, i) => x !== requests[i].id)) {
      const created = await this.client.messages.batches.create({ requests: requests.map((r, i) => ({ custom_id: ids[i], params: params(r) })) });
      state = { batchId: created.id, ids: requests.map((r) => r.id) };
      writeJson(stateFile, state);
    }
    for (;;) {
      const b = await this.client.messages.batches.retrieve(state.batchId);
      if (b.processing_status === "ended") break;
      await new Promise((res) => setTimeout(res, this.pollMs));
    }
    const byIndex = new Map<string, LlmResult>();
    for await (const item of await this.client.messages.batches.results(state.batchId)) {
      const r = requests[Number(item.custom_id.slice(1))];
      if (item.result.type === "succeeded") byIndex.set(item.custom_id, parseMessage(r.id, item.result.message as never, true));
      else byIndex.set(item.custom_id, { id: r.id, json: null, usage: NO_JSON, batch: true, error: item.result.type });
    }
    return requests.map((r, i) => byIndex.get(ids[i]) ?? { id: r.id, json: null, usage: NO_JSON, batch: true, error: "missing" });
  }
}

/** For tests and dry runs: no network, the answer comes from a function. */
export class MockExecutor implements Executor {
  constructor(private answer: (r: LlmRequest) => unknown | Promise<unknown>, readonly batch = false) {}
  calls: LlmRequest[] = [];
  async run(requests: LlmRequest[]): Promise<LlmResult[]> {
    const out: LlmResult[] = [];
    for (const r of requests) {
      this.calls.push(r);
      const json = await this.answer(r);
      const chars = r.system.reduce((n, b) => n + b.text.length, 0) + r.user.length;
      out.push({ id: r.id, json, usage: { input: Math.round(chars / 4), output: Math.round(JSON.stringify(json ?? "").length / 3), cacheRead: 0, cacheWrite: 0 }, batch: this.batch });
    }
    return out;
  }
}

/** Thrown by the file executor when it has written requests that nobody has answered yet. */
export class PendingAnswers extends Error {
  constructor(readonly files: string[]) { super(`${files.length} request${files.length === 1 ? "" : "s"} are waiting for an answer`); }
}

/**
 * No API: every request is written to `<dir>/requests/<name>.json` and its answer is read from
 * `<dir>/answers/<name>.json`, which a person (or another model session) writes. Used to try the
 * prompts and the checks on real model output before an API key exists. The name includes a hash
 * of the question, so a retry with new feedback is a new request. Token use is estimated from sizes.
 */
export class FileExecutor implements Executor {
  readonly batch = false;
  constructor(private dir: string) {
    mkdirSync(`${dir}/requests`, { recursive: true });
    mkdirSync(`${dir}/answers`, { recursive: true });
  }
  static fileName(r: LlmRequest): string {
    return `${r.id.replace(/[^a-zA-Z0-9]+/g, "_")}-${createHash("sha1").update(r.user).digest("hex").slice(0, 8)}`;
  }
  async run(requests: LlmRequest[]): Promise<LlmResult[]> {
    const pending: string[] = [];
    const out: LlmResult[] = [];
    for (const r of requests) {
      const name = FileExecutor.fileName(r);
      const answer = `${this.dir}/answers/${name}.json`;
      if (!existsSync(answer)) {
        writeFileSync(`${this.dir}/requests/${name}.json`, JSON.stringify({ id: r.id, name, stage: r.stage, system: r.system.map((b) => b.text).join("\n\n"), user: r.user, schema: r.schema }, null, 2));
        pending.push(name);
        continue;
      }
      const text = readFileSync(answer, "utf8");
      const inChars = r.system.reduce((n, b) => n + b.text.length, 0) + r.user.length;
      let json: unknown | null = null;
      try { json = JSON.parse(text); } catch { /* an unreadable answer is a failed attempt */ }
      out.push({ id: r.id, json, usage: { input: Math.round(inChars / 3.8), output: Math.round(text.length / 3.3), cacheRead: 0, cacheWrite: 0 }, batch: false, error: json === null ? "bad-json" : undefined });
    }
    if (pending.length) throw new PendingAnswers(pending);
    return out;
  }
}

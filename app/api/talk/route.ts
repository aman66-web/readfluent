import Anthropic from "@anthropic-ai/sdk";
import { dbConfigured } from "@/lib/db/env";
import { createClient } from "@/lib/db/server";
import { REPLY_SCHEMA, TALK_DAILY_LIMIT, buildSystem, parseReply, parseTalkRequest } from "@/lib/talk/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL = process.env.TALK_MODEL || "claude-sonnet-5-5";
const MAX_BODY = 16_000;

/** The browser maps these codes to its own words in the reader's language. */
function fail(status: number, code: "not_ready" | "sign_in" | "limit" | "bad_request" | "error"): Response {
  return Response.json({ error: code }, { status, headers: { "cache-control": "no-store" } });
}

/**
 * One turn of a conversation with Dewey.
 *
 * The only place the app calls a language model while somebody is using it. It answers a signed-in reader
 * (not an anonymous one), takes one message from their daily allowance before it spends anything, keeps
 * the key on the server, and sends back plain text that the screen shows as text.
 */
export async function POST(request: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !dbConfigured()) return fail(503, "not_ready");

  const raw = await request.text();
  if (raw.length > MAX_BODY) return fail(400, "bad_request");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return fail(400, "bad_request"); }
  const req = parseTalkRequest(body);
  if (!req) return fail(400, "bad_request");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) return fail(401, "sign_in");

  const { data: left, error: quotaError } = await supabase.rpc("talk_take", { p_limit: TALK_DAILY_LIMIT });
  if (quotaError) return fail(quotaError.code === "28000" ? 401 : 500, quotaError.code === "28000" ? "sign_in" : "error");
  if (typeof left !== "number" || left < 0) return fail(429, "limit");

  // The message is already counted; a failure on our side or the model's must not cost the reader one.
  const refund = async () => { try { await supabase.rpc("talk_refund"); } catch { /* the count stays; rare */ } };
  const failRefund = async (): Promise<Response> => { await refund(); return fail(502, "error"); };

  try {
    const client = new Anthropic({ apiKey: key, timeout: 25_000, maxRetries: 1 });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildSystem(req),
      messages: req.turns.map((t) => ({ role: t.role, content: t.text })),
      output_config: { format: { type: "json_schema", schema: REPLY_SCHEMA as unknown as Record<string, unknown> } },
    });
    if (msg.stop_reason === "refusal" || msg.stop_reason === "max_tokens") return await failRefund();
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return await failRefund(); }
    const reply = parseReply(parsed);
    if (!reply) return await failRefund();
    return Response.json({ ...reply, left }, { headers: { "cache-control": "no-store" } });
  } catch {
    return await failRefund();
  }
}

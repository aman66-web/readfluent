import { NextResponse } from "next/server";
import { buildLine } from "@/lib/build";
import { dbConfigured, serviceConfigured } from "@/lib/db/env";
import { createClient } from "@/lib/db/server";
import { translatorConfigured } from "@/lib/translate/google";

export const runtime = "nodejs";
// Never cached: the whole point is to report what this server has right now.
export const dynamic = "force-dynamic";

/**
 * What this deployment actually has, as three booleans.
 *
 * The database routes answer "not configured on this server yet" when an
 * environment variable is missing, and the message cannot say which —
 * naming it would tell anybody probing the server exactly what to look for
 * next. That is right for the app and useless for the person setting it up,
 * who is left guessing across two scopes and a redeploy.
 *
 * So the answer lives here instead, and it is deliberately only ever a shape,
 * never a value: whether a key is present, never any part of it. A wrong key
 * and a missing one look the same here, which is the honest limit of what can
 * be said without holding the secret up to the light.
 *
 * Open in a browser. No account needed — it has to work when sign-in is the
 * thing that is broken.
 */
export async function GET(request?: Request) {
  // The app's update check only wants the build string: answer it without touching the database.
  if (request && new URL(request.url).searchParams.has("build")) {
    return NextResponse.json({ build: buildLine() }, { headers: { "Cache-Control": "no-store" } });
  }
  const db = dbConfigured();
  const service = serviceConfigured();

  // Whether THIS browser is signed in, which is the other half of a 401 and
  // the one thing here that differs per visitor.
  let signedIn = false;
  if (db) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      signedIn = Boolean(data.user);
    } catch {
      // A misconfigured project throws rather than returning no user. That is
      // still an answer: the keys are present but they do not work.
      signedIn = false;
    }
  }

  /*
   * The shape of a value, never the value.
   *
   * "Present" is not the same as "right", and the commonest way to get this
   * wrong is not a typo — it is pasting the right string into the wrong box.
   * These say whether each value looks like the kind of thing it should be,
   * which is safe to answer out loud and is the difference between a fix and
   * an afternoon.
   */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let urlValid = false;
  try { urlValid = Boolean(url) && new URL(url).protocol.startsWith("http"); } catch { urlValid = false; }

  // Supabase keys are a JWT ("eyJ…") or one of the newer prefixed forms.
  const looksLikeKey = (v: string) =>
    v.startsWith("eyJ") || v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");

  const shape = {
    urlValid,
    urlHasWhitespace: url !== url.trim(),
    anonLooksLikeKey: !anon || looksLikeKey(anon.trim()),
    serviceLooksLikeKey: !svcKey || looksLikeKey(svcKey.trim()),
    keyHasWhitespace: anon !== anon.trim() || svcKey !== svcKey.trim(),
    // The dangerous one. If these are the same string, the key that bypasses
    // every row level security policy is being served to every visitor's
    // browser, because NEXT_PUBLIC_ compiles it into the JavaScript.
    anonIsTheServiceKey: Boolean(anon) && anon.trim() === svcKey.trim(),
  };

  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((v): v is string => typeof v === "string");

  const wrongShape = [
    !shape.urlValid && Boolean(url) && "NEXT_PUBLIC_SUPABASE_URL is not a URL. It must include the scheme: https://YOUR-PROJECT.supabase.co, not YOUR-PROJECT.supabase.co. Copy the whole Project URL from Supabase -> Settings -> API.",
    shape.urlHasWhitespace && "NEXT_PUBLIC_SUPABASE_URL has a space or newline around it. Re-paste it with nothing before or after.",
    !shape.anonLooksLikeKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a Supabase key. It is the long one marked anon / public in Supabase -> Settings -> API, and starts eyJ or sb_publishable_.",
    !shape.serviceLooksLikeKey && "SUPABASE_SERVICE_ROLE_KEY does not look like a Supabase key. It is the one marked service_role / secret, and starts eyJ or sb_secret_.",
    shape.keyHasWhitespace && "a key has a space or newline around it",
    shape.anonIsTheServiceKey && "DANGER: the anon key and the service role key are the same string. The service role key bypasses every security policy and NEXT_PUBLIC_ publishes it to every visitor. Rotate it in Supabase now.",
  ].filter((v): v is string => typeof v === "string");

  return NextResponse.json({
    ok: service && !wrongShape.length,
    // Which build is answering. Compared with the same line on /health it
    // says whether a browser is holding an older bundle than the server.
    build: buildLine(),
    db,
    service,
    // Whether the server's translator has its key; never the key. Off by the owner's choice (3 Oct 2026): phones translate books themselves.
    translator: translatorConfigured(),
    signedIn,
    missing,
    wrongShape,
    // The commonest cause by a distance, and the one nothing on screen hints at.
    hint: wrongShape.length
      ? "A value is present but is not the kind of thing it should be. See wrongShape."
      : missing.length
      ? "Set these in Vercel -> Settings -> Environment Variables, tick Production, then REDEPLOY. Variables are read at build time, so adding one changes nothing until the next deployment."
      : service
        ? "Configured."
        : "Configured, but something is not adding up. Check for a stray space or newline in a pasted value.",
  });
}

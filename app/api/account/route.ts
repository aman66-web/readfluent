import { dbConfigured, serviceConfigured } from "@/lib/db/env";
import { createClient } from "@/lib/db/server";
import { createServiceClient } from "@/lib/db/service";

export const runtime = "nodejs";

function json(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/**
 * Delete the signed-in account.
 *
 * Deleting the auth user cascades through public.users to every synced
 * document that belongs to them (see 0001_init.sql), so this route only has to
 * establish who is asking and then remove that one row. The reader's browser
 * data is erased by the client either way — this is only the copy on the
 * server. App Store review requires this to exist.
 */
export async function DELETE() {
  if (!dbConfigured()) return json(503, "There is no account service on this server.");
  if (!serviceConfigured()) return json(503, "This server cannot delete accounts.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json(401, "You are not signed in.");

  // Sign the browser out first: once the user row goes the session's refresh
  // token is dead, and a later sign-out would only error.
  try { await supabase.auth.signOut(); } catch { /* the row is going anyway */ }

  const admin = createServiceClient();
  const { error: gone } = await admin.auth.admin.deleteUser(data.user.id);
  if (gone) return json(500, "Could not delete the account. Nothing was changed.");

  return Response.json({ deleted: true });
}

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. BYPASSES RLS — server-side only, never in a component.
 *
 * Used only where the spec requires cross-user access: `generation_cache`
 * (SPEC.md §12: "service-role only") and the pack seed script.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

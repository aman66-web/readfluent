/** True when the app has a Supabase project to talk to. */
export const dbConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** True when server routes can act as the service role (quota, cache, spend). */
export const serviceConfigured = () =>
  dbConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

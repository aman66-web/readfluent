/**
 * The marketing site's addresses, and when a request to one of them is shown
 * the site instead of the app.
 *
 * The site is one static page (public/site/index.html) and the app is
 * everything else. On the marketing domain the page takes the root, so
 * somebody typing the product's domain sees what the app is and where to get it;
 * every other path — /welcome, /privacy, /book/rome — is still the web app,
 * so a link from the site into the app works on the same domain. On the
 * vercel.app address, which the native apps load, nothing changes: its root
 * is still Today.
 *
 * Pure, so proxy.ts can ask it before any Supabase work and
 * tests/unit/site-hosts.test.ts can hold it to the rules without a server.
 */

/**
 * Used when MARKETING_HOSTS is unset or empty: none, so no host is a marketing
 * host until the domain is known and set in the environment (DECISIONS.md).
 */
export const DEFAULT_MARKETING_HOSTS: readonly string[] = [];

/** The file the marketing hosts show at their root. */
export const SITE_PAGE = "/site/index.html";

/** A Host header as a bare lower-case name: no port, no trailing dot. */
export function normalHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

/** The marketing hosts from MARKETING_HOSTS (comma-separated), or the defaults. */
export function marketingHosts(env: string | null | undefined): readonly string[] {
  const listed = (env ?? "").split(",").map(normalHost).filter(Boolean);
  return listed.length > 0 ? listed : DEFAULT_MARKETING_HOSTS;
}

export function isMarketingHost(host: string | null | undefined, hosts: readonly string[]): boolean {
  const h = normalHost(host);
  return h.length > 0 && hosts.includes(h);
}

/**
 * The site's own files, on any host: the page, its assets, and /site itself
 * (next.config.ts rewrites that to the page, so it can be seen on the
 * vercel.app address before the domain is connected). Nobody fetching these
 * is using the app, so the proxy leaves them alone.
 */
export function isSitePath(pathname: string): boolean {
  return pathname === "/site" || pathname.startsWith("/site/");
}

/**
 * Whether the request carries a session with the web app: one of Supabase's
 * auth cookies (`sb-<project>-auth-token`, split into `.0`, `.1` when long).
 * The proxy signs anonymous visitors in on their first app page, so anybody
 * who has opened the web app on this domain has one.
 */
export function hasAppSession(cookieNames: readonly string[]): boolean {
  return cookieNames.some((n) => /^sb-.+-auth-token(\.\d+)?$/.test(n));
}

export interface SiteRequest {
  host: string | null | undefined;
  pathname: string;
  /** The visitor already has a session with the web app (see hasAppSession). */
  hasSession?: boolean;
}

/**
 * The page to show instead of the app, or null to let the app answer.
 *
 * Only the root of a marketing host. And not for somebody already using the
 * web app there: the app's Today is "/", and a reader whose tab bar sent
 * them to the marketing page would find the web app broken on its own
 * domain. (The session cookie is the only sign of them the proxy can see:
 * Next strips the RSC headers of the app's own navigations from the request
 * before the proxy is called.)
 */
export function sitePage(req: SiteRequest, hosts: readonly string[]): string | null {
  if (req.pathname !== "/") return null;
  if (!isMarketingHost(req.host, hosts)) return null;
  if (req.hasSession) return null;
  return SITE_PAGE;
}

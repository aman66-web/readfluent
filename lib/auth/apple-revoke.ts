import { sign } from "node:crypto";
import { BUNDLE_ID } from "@/lib/brand";

/**
 * Revoking a Sign in with Apple login when its account is deleted (App Store
 * 5.1.1(v): since 2022 Apple requires it of every app that offers the button).
 *
 * The iPhone hands an authorization code to /api/account at the moment of
 * deletion (lib/auth/native.ts `appleAuthorizationCode`); this trades it for a
 * refresh token and revokes that, which ends the app's link to the Apple ID.
 *
 * Server only. Needs three values from a "Sign in with Apple" key made in the
 * Apple Developer account (Certificates, Identifiers & Profiles > Keys):
 *   APPLE_TEAM_ID, APPLE_SIWA_KEY_ID, APPLE_SIWA_PRIVATE_KEY (the .p8 text;
 *   "\n" escapes are accepted). Without them deletion still works, it just
 *   cannot revoke.
 */

const APPLE = "https://appleid.apple.com";

function env() {
  const team = process.env.APPLE_TEAM_ID?.trim();
  const kid = process.env.APPLE_SIWA_KEY_ID?.trim();
  const key = process.env.APPLE_SIWA_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  return team && kid && key ? { team, kid, key } : null;
}

export const appleRevokeConfigured = (): boolean => env() !== null;

const b64url = (v: string | Buffer): string => Buffer.from(v).toString("base64url");

/** The short-lived client secret Apple asks for: an ES256 JWT signed with the Sign in with Apple key. */
function clientSecret(team: string, kid: string, key: string): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "ES256", kid }));
  const body = b64url(JSON.stringify({ iss: team, iat: now, exp: now + 300, aud: APPLE, sub: BUNDLE_ID }));
  const sig = sign("sha256", Buffer.from(`${head}.${body}`), { key, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${b64url(sig)}`;
}

/** Trades the code for a refresh token and revokes it. True when Apple confirmed the revocation. */
export async function revokeAppleCode(code: string): Promise<boolean> {
  const e = env();
  if (!e || !code) return false;
  try {
    const secret = clientSecret(e.team, e.kid, e.key);
    const tokenRes = await fetch(`${APPLE}/auth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: BUNDLE_ID, client_secret: secret, code, grant_type: "authorization_code" }),
    });
    if (!tokenRes.ok) return false;
    const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
    const token = tokens.refresh_token ?? tokens.access_token;
    if (!token) return false;
    const revokeRes = await fetch(`${APPLE}/auth/revoke`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: BUNDLE_ID, client_secret: secret, token,
        token_type_hint: tokens.refresh_token ? "refresh_token" : "access_token",
      }),
    });
    return revokeRes.ok;
  } catch {
    return false;
  }
}

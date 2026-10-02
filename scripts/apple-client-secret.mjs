#!/usr/bin/env node
/**
 * Makes the "client secret" Supabase asks for under Authentication → Providers → Apple.
 * Apple's secret is not a password: it is a token signed with the .p8 key from the Apple Developer site,
 * and it stops working after six months at most, so make a new one and paste it into Supabase before then.
 *
 *   node scripts/apple-client-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <path-to-AuthKey.p8>
 *
 * Prints the token and when it expires. The .p8 file stays on this computer: never commit it, never paste it into a chat.
 */
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const [team, kid, sub, file] = process.argv.slice(2);
if (!team || !kid || !sub || !file) {
  console.error("Usage: node scripts/apple-client-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <path-to-AuthKey.p8>");
  process.exit(1);
}
const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // 180 days: inside Apple's six-month limit
const head = b64({ alg: "ES256", kid, typ: "JWT" });
const body = b64({ iss: team, iat: now, exp, aud: "https://appleid.apple.com", sub });
const key = createPrivateKey(readFileSync(file, "utf8"));
const sig = sign("sha256", Buffer.from(`${head}.${body}`), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
console.log(`${head}.${body}.${sig}`);
console.error(`\nExpires ${new Date(exp * 1000).toISOString().slice(0, 10)}: make a new one before then.`);

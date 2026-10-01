"use client";

import { createClient } from "@/lib/db/client";
import { isNative, signInNative } from "@/lib/auth/native";
import { callbackUrl } from "@/lib/auth/next";

export type OAuthProvider = "google" | "apple";

/**
 * The providers this build offers.
 *
 * Each `process.env.NEXT_PUBLIC_…` is written out in full so the bundler
 * inlines it at build time and the server and the client agree about which
 * buttons exist. A provider is on only when its Supabase Auth side is
 * configured too — Supabase gives the browser no way to ask which providers a
 * project has enabled, so this flag is the only thing standing between a
 * reader and a button that goes to Google and comes back with "Unsupported
 * provider". See README, "Google and Apple sign-in".
 *
 * `1` or `true`, either case: the value is typed into a hosting dashboard by
 * hand, and a provider silently missing because somebody wrote `true` is a bad
 * half-hour for no reason.
 */
const on = (v: string | undefined): boolean => v === "1" || (v ?? "").toLowerCase() === "true";

export function oauthProviders(): OAuthProvider[] {
  const out: OAuthProvider[] = [];
  if (on(process.env.NEXT_PUBLIC_AUTH_GOOGLE)) out.push("google");
  if (on(process.env.NEXT_PUBLIC_AUTH_APPLE)) out.push("apple");
  return out;
}

/**
 * Sign in with a provider.
 *
 * On the web the whole browser leaves for the provider and comes back through
 * /auth/callback, which trades the code for a session and lands on `next`. On
 * the native build that would open Google or Apple INSIDE THE APP'S OWN
 * WEBVIEW, which Google refuses to complete sign-in in (its own policy against
 * embedded user-agents), so the native build takes a different path entirely —
 * lib/auth/native opens the system browser and comes back through a deep link.
 * Same signature, same call site either way.
 *
 * Resolves to an error message, or null once the redirect (or the system
 * browser) is under way.
 */
export async function signInWith(provider: OAuthProvider, next: string): Promise<string | null> {
  if (isNative()) return signInNative(provider, next);
  const { error } = await createClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl(window.location.origin, next) },
  });
  return error ? error.message : null;
}

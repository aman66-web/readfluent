"use client";

import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { createClient } from "@/lib/db/client";
import { safeNext } from "@/lib/auth/next";
import type { OAuthProvider } from "@/lib/auth/providers";
import { APP_SCHEME, BUNDLE_ID } from "@/lib/brand";
import GOOGLE from "./google.json";

/**
 * Sign-in, from inside the native shell.
 *
 * The website's own `signInWith` (components/Account.tsx) sends the whole
 * browser to the provider and back through `/auth/callback` — the right
 * thing on the web, and the wrong thing here, because GOOGLE REFUSES TO
 * COMPLETE SIGN-IN INSIDE AN EMBEDDED WEBVIEW. That is Google's own security
 * policy against "embedded user-agents", not a bug to route around; the
 * button would open, show Google's page, and fail with "This browser or app
 * may not be secure" the moment a password is entered. Apple has no such
 * rule, but there is no reason to run two different flows for the two
 * buttons.
 *
 * So both open in the SYSTEM browser instead (Browser.open — SFSafariViewController
 * on iOS, Chrome Custom Tabs on Android, a real browser the OS vouches for,
 * not the app's own WebView), and come back through a custom URL scheme
 * rather than an https:// redirect, because a scheme the OS does not
 * otherwise know how to open is exactly what gets handed to THIS app as an
 * appUrlOpen event — registered in ios/App/App/Info.plist for iOS and
 * android/app/src/main/AndroidManifest.xml for Android, both the same
 * `readfluent://` scheme, and README, "Google and Apple sign-in" for the
 * matching entry Supabase's Redirect URLs need.
 */

const NATIVE_SCHEME = APP_SCHEME;
const NATIVE_CALLBACK_PATH = "auth/callback";

export const isNative = (): boolean => Capacitor.isNativePlatform();

export const nativeCallbackUrl = (next: string): string =>
  `${NATIVE_SCHEME}://${NATIVE_CALLBACK_PATH}?next=${encodeURIComponent(safeNext(next))}`;

/**
 * Opens the provider in the system browser and returns. The sign-in itself
 * finishes later, asynchronously, when the deep link below fires — there is
 * nothing to await it here, the same way there is nothing to await on the web
 * once `window.location` has been told to leave.
 */
export async function signInNative(provider: OAuthProvider, next: string): Promise<string | null> {
  if (provider === "apple" && appleSheetAvailable()) return signInWithAppleSheet();
  if (provider === "google" && googleSheetAvailable()) return signInWithGoogleSheet();
  const { data, error } = await createClient().auth.signInWithOAuth({
    provider,
    // skipBrowserRedirect: supabase-js's default move is to navigate
    // window.location itself, which on native would try to send the APP'S
    // OWN WebView to Google — precisely the embedded-WebView case this
    // whole file exists to avoid. This flag asks for the URL back instead,
    // so it can be opened in Browser.open below.
    options: { redirectTo: nativeCallbackUrl(next), skipBrowserRedirect: true },
  });
  if (error) return error.message;
  // Supabase always returns a url alongside a null error; a missing one is
  // not a state the caller's UI has anything sensible to show, so it is
  // thrown rather than returned — components/welcome/SignIn.tsx already
  // catches a throw here and shows the same translated failure message a
  // rejected promise from the web flow would.
  if (!data.url) throw new Error("no OAuth url");
  await Browser.open({ url: data.url });
  return null;
}

/**
 * Catches the deep link and hands it to the SAME route the web build uses,
 * rather than trading the code for a session again here.
 *
 * capacitor.config.ts points this app's one WebView at the real deployed
 * site (`server.url`), so `window.location.origin` inside the running app
 * already IS that origin — and /auth/callback there already knows how to
 * exchange a code for a session server-side and redirect on to `next`. That
 * exchange living in exactly one place is what keeps the web and native
 * builds from quietly disagreeing about what a failed sign-in looks like;
 * writing it a second time here, client-side, is the tempting shortcut this
 * function deliberately does not take.
 *
 * A no-op on the web. Mounted once from NativeAuthBridge in the root layout;
 * returns the unsubscribe function React's effect cleanup wants.
 */
export function listenForNativeAuth(): () => void {
  if (!isNative()) return () => {};
  // addListener resolves to the handle rather than returning it directly, in
  // this version of the plugin API; the cleanup below awaits the same promise
  // rather than a second call, so it can never race the subscription itself.
  const sub = CapApp.addListener("appUrlOpen", ({ url }) => {
    let incoming: URL;
    try {
      incoming = new URL(url);
    } catch {
      return; // Not a URL worth acting on.
    }
    if (incoming.protocol !== `${NATIVE_SCHEME}:`) return; // Some other deep link.
    void Browser.close().catch(() => { /* already closed, or never opened */ });
    const code = incoming.searchParams.get("code");
    if (!code) return; // The provider declined, or this was reopened some other way.
    const target = new URL("/auth/callback", window.location.origin);
    target.searchParams.set("code", code);
    target.searchParams.set("next", safeNext(incoming.searchParams.get("next")));
    window.location.href = target.toString();
  });
  return () => { void sub.then((h) => h.remove()); };
}

/** The app's bundle ID: the audience Apple writes into the identity token, and one of Supabase's Apple client IDs. */
const APPLE_CLIENT_ID = BUNDLE_ID;

/**
 * Sign in with Apple through the iPhone's own sheet — Face ID and "Continue"
 * — rather than a browser.
 *
 * Only on iOS, and only in a build that carries the plugin: an older build,
 * or Android (where Apple has no system sheet), keeps the browser flow above.
 */
const appleSheetAvailable = (): boolean =>
  Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("SignInWithApple");

/** Returned when the learner closes the sheet: not an error, nothing to say. */
export const SIGN_IN_CANCELLED = "";

/**
 * Returned when a sheet has signed somebody in, here in the page: the caller
 * carries on from where it is, as the emailed code does.
 *
 * It used to reload the whole app at the page after sign-in instead, and on
 * a phone that reload is the app starting over from the network — about ten
 * seconds of the Google button saying it was busy (27 Sep 2026: "it gets
 * stuck in this screen for around 10 seconds"). The session is already in
 * the page's own client and its cookies by then; everything that cares
 * (the plan, purchases, sync) hears the sign-in as it happens.
 */
export const SIGNED_IN = "\u0001signed-in";

/** How long the sign-in itself may take before it is called a failure rather than left spinning. */
const SIGN_IN_TIMEOUT_MS = 20000;

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error("sign-in timed out")), SIGN_IN_TIMEOUT_MS);
    work.then((v) => { window.clearTimeout(id); resolve(v); }, (e) => { window.clearTimeout(id); reject(e); });
  });
}

/**
 * The sheet hands back an identity token signed by Apple; Supabase checks it
 * and makes the session here, in the page — no redirect, no /auth/callback.
 *
 * The nonce is what stops a stolen token being replayed: Apple is given its
 * SHA-256 and writes that into the token, Supabase is given the raw value and
 * checks the two match.
 */
async function signInWithAppleSheet(): Promise<string | null> {
  const raw = randomNonce();
  let token: string;
  try {
    // Loaded here, not at the top: only an iPhone signing in with Apple needs it.
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
    const res = await SignInWithApple.authorize({
      clientId: APPLE_CLIENT_ID,
      redirectURI: "",
      scopes: "email name",
      nonce: await sha256Hex(raw),
    });
    token = res.response.identityToken;
  } catch {
    // Closing the sheet rejects too; there is no way to tell it apart from a
    // failure that would have anything useful to say, so neither says anything.
    return SIGN_IN_CANCELLED;
  }
  const { error } = await withTimeout(createClient().auth.signInWithIdToken({ provider: "apple", token, nonce: raw }));
  if (error) return error.message;
  return SIGNED_IN;
}

/**
 * A fresh Sign in with Apple authorization code, asked for when an Apple
 * account is being deleted so the server can revoke the login with Apple
 * (lib/auth/apple-revoke.ts). Null off the iPhone, or if the sheet is closed.
 */
export async function appleAuthorizationCode(): Promise<string | null> {
  if (!appleSheetAvailable()) return null;
  try {
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
    const res = await SignInWithApple.authorize({ clientId: APPLE_CLIENT_ID, redirectURI: "", scopes: "" });
    return res.response.authorizationCode || null;
  } catch {
    return null;
  }
}

/**
 * Sign in with Google through Google's own sheet — the accounts already on
 * the phone, one tap — rather than a browser page that asks for an email.
 *
 * A sheet over the app, "Choose an account to continue", the accounts listed.
 * The browser flow above can't list them (it shares nothing with Safari), and says "continue
 * to" the database's address. Google's SDK, through @capgo/capacitor-social-
 * login, does both. It needs a build that carries the plugin, the iOS client
 * ID in ./google.json, and that ID's reversed form as a URL scheme in
 * Info.plist (RELEASE.md, "Native Google sign-in"); anything short of that
 * keeps the browser flow.
 *
 * The web client ID is given as the server client ID, so the token is issued
 * to the client Supabase's Google provider already trusts; the nonce works as
 * Apple's does, and is only handed to Supabase if Google wrote it in.
 */
const googleSheetAvailable = (): boolean =>
  Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("SocialLogin") && Boolean(GOOGLE.iosClientId);

let googleReady: Promise<void> | null = null;

/** Google's SDK, set up once; the first sign-in no longer waits for it. */
function readyGoogle(): Promise<void> {
  googleReady ??= import("@capgo/capacitor-social-login").then(({ SocialLogin }) => SocialLogin.initialize({
    google: { iOSClientId: GOOGLE.iosClientId, iOSServerClientId: GOOGLE.webClientId || undefined, mode: "online" },
  }));
  return googleReady;
}

/**
 * Called when the sign-in screen opens: the Google sheet's SDK is loaded and
 * set up while somebody is still reading the screen, so tapping the button
 * brings the sheet up at once. Does nothing off the phone or where the sheet
 * isn't available.
 */
export function warmUpNativeSignIn(): void {
  if (googleSheetAvailable()) void readyGoogle().catch(() => { googleReady = null; });
}

async function signInWithGoogleSheet(): Promise<string | null> {
  const raw = randomNonce();
  let token: string | null;
  try {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    await readyGoogle();
    const res = await SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"], nonce: await sha256Hex(raw) } });
    token = res.provider === "google" && "idToken" in res.result ? res.result.idToken : null;
  } catch {
    // Closing the sheet rejects, like Apple's; nothing to say about it.
    googleReady = null;
    return SIGN_IN_CANCELLED;
  }
  if (!token) return SIGN_IN_CANCELLED;
  const { error } = await withTimeout(createClient().auth.signInWithIdToken({
    provider: "google",
    token,
    ...(tokenHasNonce(token) ? { nonce: raw } : {}),
  }));
  if (error) return error.message;
  return SIGNED_IN;
}

/** Whether an ID token carries a nonce claim (read, not verified: Supabase verifies it). */
function tokenHasNonce(token: string): boolean {
  try {
    const body = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return "nonce" in JSON.parse(atob(body.padEnd(body.length + ((4 - (body.length % 4)) % 4), "=")));
  } catch {
    return false;
  }
}

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

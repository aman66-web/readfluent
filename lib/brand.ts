/**
 * The product's identity, in one place.
 *
 * Plain constants with no "use client", so the root layout's metadata, the
 * web manifest (a server route), the native sign-in and the storage keys can
 * all read them. A rename is an edit to this file and, for the three values
 * the native projects also carry (bundle id, URL scheme, name), to ios/ and
 * android/ — tests/unit/native-plugins.test.ts holds the two in step.
 *
 * The bundle id and scheme are working placeholders until the store listings
 * exist (DECISIONS.md, 1 Oct 2026); change them here and in the native
 * projects together.
 */
export const APP_NAME = "ReadFluent";
/** Who runs the app and decides how data is used (the data controller); the owner's Apple and Google developer account. */
export const COMPANY_NAME = "CLARIFO DEVELOPERS LTD";
/** Where readers write to. Set NEXT_PUBLIC_SUPPORT_EMAIL in Vercel; until then the pages point to the store listings. */
export const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "").trim();
/** The mascot's name: the little cyan space reader who guides the reader (components/mascot/Mascot.tsx). One place, so a new name is one edit. */
export const MASCOT_NAME = "Pluto";
export const TAGLINE = "Real books. Your level.";

/** The reverse-DNS id registered with Apple and Google. Must match capacitor.config.ts and both native projects. */
export const BUNDLE_ID = "com.amanmarwaha.ReadFluent";

/** The custom URL scheme a system-browser sign-in comes back through (readfluent://auth/callback). */
export const APP_SCHEME = "readfluent";

/** Every localStorage / IndexedDB key this app writes starts with this. Chosen once, used only through `storageKey`. */
export const STORAGE_PREFIX = "readfluent.";

/** `readfluent.<name>.v<version>` — the one way a storage key is built. */
export const storageKey = (name: string, version = 1): string => `${STORAGE_PREFIX}${name}.v${version}`;

/**
 * The brand colour is cyan (owner, 1 Oct 2026). `bright` is for dark grounds (the
 * first screen, buttons on black); `deep` is for text and fills on the app's light
 * paper, where bright cyan would be too faint to read. app/globals.css carries the
 * same values as CSS tokens, and tests/unit/brand.test.ts holds the two together.
 */
export const BRAND = {
  /** Light cyan: highlights and the first line of the name. */
  light: "#A5F3FC",
  /** The brand cyan on dark. */
  bright: "#22D3EE",
  /** The brand cyan on paper: passes contrast for text. */
  deep: "#0E7490",
  /** The dark that sits on bright cyan (button text). */
  ink: "#04222B",
} as const;

/** Cache Storage names start with this (public/sw.js uses the same literal; tests/unit/sw.test.ts holds them together). */
export const CACHE_PREFIX = "readfluent-";

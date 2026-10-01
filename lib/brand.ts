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
export const TAGLINE = "Real books. Your level.";

/** The reverse-DNS id registered with Apple and Google. Must match capacitor.config.ts and both native projects. */
export const BUNDLE_ID = "com.amanmarwaha.ReadFluent";

/** The custom URL scheme a system-browser sign-in comes back through (readfluent://auth/callback). */
export const APP_SCHEME = "readfluent";

/** Every localStorage / IndexedDB key this app writes starts with this. Chosen once, used only through `storageKey`. */
export const STORAGE_PREFIX = "readfluent.";

/** `readfluent.<name>.v<version>` — the one way a storage key is built. */
export const storageKey = (name: string, version = 1): string => `${STORAGE_PREFIX}${name}.v${version}`;

/** Cache Storage names start with this (public/sw.js uses the same literal; tests/unit/sw.test.ts holds them together). */
export const CACHE_PREFIX = "readfluent-";

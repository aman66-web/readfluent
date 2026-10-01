import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The native shell around the web app.
 *
 * `server.url` points the app's one WebView at the LIVE deployed site rather
 * than bundling a static copy — the right call here and not a shortcut,
 * because this is not a static app. API routes and a middleware proxy do real
 * work on the server: the auth callback that trades an OAuth code for a
 * session, the account deletion route, the RevenueCat webhook. A static export
 * has none of a server, so it cannot run any of that.
 *
 * That also means the books are never in the app. Content is JSON, photos and
 * audio fetched from storage when somebody reads or downloads (SPEC.md §9), so
 * the installed app is a thin shell.
 *
 * TODO before building: replace PRODUCTION_URL with the real deployed origin
 * (a Vercel URL or the eventual custom domain), and add the same host to
 * WKAppBoundDomains in ios/App/App/Info.plist. Wrong here does not fail
 * loudly — the app opens to a blank screen or someone else's site, which is a
 * worse first five minutes than a build error.
 */
const PRODUCTION_URL = "https://readfluent-eta.vercel.app";

const config: CapacitorConfig = {
  // Must match the App ID registered in the Apple Developer portal, the
  // Bundle Identifier in Xcode's Signing & Capabilities, and the Android
  // applicationId — the three have to agree exactly or codesigning fails with
  // no useful message. Written out here, not imported: the CLI transpiles this
  // one file by itself. lib/brand.ts is the source, and
  // tests/unit/native-identity.test.ts holds this file and both native
  // projects to it.
  appId: "com.amanmarwaha.ReadFluent",
  appName: "ReadFluent",
  /*
   * NOT `public`. `cap sync` copies webDir into every native build, and with
   * server.url set nothing in it is ever shown, so it holds one tiny page the
   * CLI needs to exist. Pointing this at `public/` is how a 239 MB audio
   * folder once rode along in every build. .capacitorignore is the second
   * guard; scripts/check-native-bundle.mjs checks both.
   */
  webDir: "native-shell",
  server: {
    url: PRODUCTION_URL,
    // The WebView is told the content is remote, which matters for cookies
    // and for anything checking `window.location`.
    cleartext: false,
  },
  // The ground behind the page wherever the page does not reach: launch,
  // overscroll. The app's own paper colour, so there is never a white flash.
  backgroundColor: "#FFFFFF",
  ios: {
    // Edge to edge: the page runs under the status bar and the home
    // indicator, and every screen keeps its own content clear of them with
    // env(safe-area-inset-*) (viewport-fit=cover in app/layout.tsx).
    contentInset: "never",
    // With WKAppBoundDomains in ios/App/App/Info.plist, this is what lets the
    // WebView run the service worker that keeps downloaded versions readable
    // offline (public/sw.js). It also stops the WebView itself loading any
    // other site, which nothing here does: sign-in is native sheets or the
    // system browser (lib/auth/native.ts), and Capacitor opens other sites'
    // links in Safari. Takes effect from the next native build.
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    // Dark status-bar text from the first frame, before the page has loaded
    // and components/NativeChrome takes over.
    StatusBar: { style: "LIGHT" },
    // Google's own sign-in sheet (lib/auth/native.ts), and only Google's:
    // Apple signs in through @capacitor-community/apple-sign-in.
    SocialLogin: {
      providers: { google: true, apple: false, facebook: false, twitter: false },
      logLevel: 1,
    },
  },
};

export default config;

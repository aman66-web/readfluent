import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NativeAuthBridge } from "@/components/auth/NativeAuthBridge";
import { PurchasesBridge } from "@/components/purchases/PurchasesBridge";
import { NativeChrome } from "@/components/NativeChrome";
import { Pwa } from "@/components/Pwa";
import { LocaleSync } from "@/lib/i18n/react";
import { APP_NAME, TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: APP_NAME,
  description: TAGLINE,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  // Safari does not take an SVG touch icon, so the home-screen one is a PNG.
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // Without viewport-fit=cover, env(safe-area-inset-*) is 0 and content sits
  // under the home indicator in a PWA. resizes-content keeps a focused field on
  // screen when the keyboard rises.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className="h-full antialiased">
      <body className="min-h-full">
        {/* Catches a Google/Apple sign-in coming back from the system browser
            on the native build. Renders nothing on the web. */}
        <NativeAuthBridge />
        {/* Configures RevenueCat on the native build, keyed to the same
            Supabase user id everything else uses. Renders nothing. */}
        <PurchasesBridge />
        {/* The status bar's text colour on the native build. Renders nothing. */}
        <NativeChrome />
        {/* The page's lang and dir follow the reader's language. Renders nothing. */}
        <LocaleSync />
        {/* The phone column: 375px is the design width, 440px the cap. */}
        <div className="mx-auto min-h-full max-w-[440px]">{children}</div>
        <Pwa />
      </body>
    </html>
  );
}

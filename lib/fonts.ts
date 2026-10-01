import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

/**
 * The two faces the first screen is set in: a geometric sans for the button and
 * small print, and a high-contrast italic serif for the tagline. Self-hosted by
 * Next at build time. Applied on the first screen only (app/welcome/page.tsx);
 * the rest of the app stays on the system stack until its screens are designed.
 */
export const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

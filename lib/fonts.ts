import { Playfair_Display } from "next/font/google";

/**
 * The serif used by titles across the app. Only the one face every route uses is loaded here, so it is the
 * only one preloaded everywhere. The first screen's fuller set (italic, regular, the sans) is in
 * lib/fonts-welcome.ts and loads only on the routes that import it.
 */
export const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
});

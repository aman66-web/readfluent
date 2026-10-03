import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

/**
 * The faces the first screen and the placement test are set in: a geometric sans for the button and small
 * print, and a high-contrast serif (regular, bold, italic) for the tagline. Self-hosted by Next at build
 * time; imported only by those routes so no other page preloads them.
 */
export const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const displayFull = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

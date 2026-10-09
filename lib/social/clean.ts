/**
 * Names that strangers see (league boards, friend lists) are typed by readers, so a short
 * list of plainly abusive words keeps the worst of them off other people's screens (App
 * Store 1.2: a filter, a way to report, a way to block). A name that matches is shown as
 * the reader's #code instead; a username that matches is refused when it is chosen.
 */
const BLOCKED = [
  "fuck", "fuk", "shit", "cunt", "bitch", "bastard", "pussy", "asshole", "arsehole", "wank",
  "whore", "slut", "nigger", "nigga", "faggot", "fag", "retard", "nazi", "hitler", "porn", "sex",
  "penis", "vagina", "boob", "tits", "twat", "kike", "chink", "tranny", "suicide",
  "puta", "puto", "mierda", "pendejo", "cabron", "merde", "salope", "connard", "scheisse", "fotze", "hure",
  "cazzo", "stronzo", "vaffanculo", "caralho", "porra", "blyat", "pizda", "kurwa", "chutiya", "madarchod",
  "bhenchod", "sik", "orospu", "amk",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

function fold(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c).replace(/[^a-z]/g, "");
}

/** Whether a name contains one of the blocked words (letters only, accents and look-alike digits folded). */
export function isOffensive(name: string): boolean {
  const f = fold(name);
  if (!f) return false;
  // Short words only count on their own, so "Sikander" or "Essex" stay fine.
  return BLOCKED.some((w) => (w.length <= 3 ? f === w : f.includes(w)));
}

/** The name to show: empty (so the screen falls back to the reader's code) when it is offensive. */
export const cleanName = (name: string): string => (isOffensive(name) ? "" : name);

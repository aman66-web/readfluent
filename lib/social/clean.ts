/**
 * Names that strangers see (league boards, friend lists) are typed by readers, so a short
 * list of plainly abusive words keeps the worst of them off other people's screens (App
 * Store 1.2: a filter, a way to report, a way to block). A name that matches is shown as
 * the reader's #code instead; a username that matches is refused when it is chosen.
 *
 * Names are real names in twenty languages, so most words must stand alone to count
 * ("Nazir", "Yamashita", "Caputo", "Pornchai" are people); only a few that hide inside
 * almost nothing innocent are matched anywhere in a word.
 */

/** Matched anywhere inside a word: rarely part of an innocent name. */
const ANYWHERE = [
  "fuck", "nigger", "nigga", "faggot", "motherfucker", "asshole", "arsehole", "bitch", "bastard",
  "whore", "slut", "retard", "tranny", "vaffanculo", "madarchod", "bhenchod", "chutiya", "orospu",
];

/** Matched only as a whole word (or the whole name with spaces and dots removed). */
const WHOLE = [
  "shit", "cunt", "cunts", "wank", "wanker", "cock", "pussy", "fag", "nazi", "hitler", "porn", "sex", "penis", "vagina",
  "boob", "boobs", "tits", "twat", "kike", "spic", "chink", "rape", "rapist", "suicide", "kill",
  "puta", "puto", "mierda", "pendejo", "cabron", "merde", "salope", "connard", "scheisse", "fotze", "hure",
  "cazzo", "stronzo", "caralho", "porra", "blyat", "suka", "pizda", "kurwa", "sik", "amk",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

const fold = (s: string): string =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[013457@$!]/g, (c) => LEET[c] ?? c);

/** Whether a name contains one of the blocked words (accents and look-alike digits folded). */
export function isOffensive(name: string): boolean {
  const folded = fold(name);
  // Words as written (split on anything that is not a letter), plus the whole name run together,
  // so "s.h.i.t" or "shit_head" are caught but "Arthur Evans" is never read as one word.
  const words = folded.split(/[^a-z]+/).filter(Boolean);
  const joined = words.join("");
  if (!joined) return false;
  if (ANYWHERE.some((w) => joined.includes(w))) return true;
  const whole = new Set(WHOLE);
  if (words.some((w) => whole.has(w))) return true;
  // Separated letters ("s h i t") come out as one-letter words: judge those run together.
  return words.length > 1 && words.every((w) => w.length === 1) && whole.has(joined);
}

/** The name to show: empty (so the screen falls back to the reader's code) when it is offensive. */
export const cleanName = (name: string): string => (isOffensive(name) ? "" : name);

/**
 * Urdu and Arabic in Latin letters, approximately. These scripts leave most short vowels unwritten, so the reading of a
 * word is partly guessed: written vowel marks are used where there are any; long vowels (ا و ی) are read as vowels; and an
 * "a" is put between two consonants that have nothing between them. Good enough to sound a word out, not a spelling to learn.
 */
const LET: Record<string, string> = {
  ب: "b", پ: "p", ت: "t", ٹ: "t", ث: "s", ج: "j", چ: "ch", ح: "h", خ: "kh", د: "d", ڈ: "d", ذ: "z", ر: "r", ڑ: "r", ز: "z", ژ: "zh",
  س: "s", ش: "sh", ص: "s", ض: "z", ط: "t", ظ: "z", ع: "'", غ: "gh", ف: "f", ق: "q", ک: "k", ك: "k", گ: "g", ل: "l", م: "m", ن: "n", ں: "n",
  ہ: "h", ھ: "h", ه: "h", ة: "a", ء: "'", أ: "a", إ: "i", ئ: "'", ؤ: "'", ٹ_: "t",
};
// th/dh/ض as the Arabic reading when the text is Arabic rather than Urdu.
const AR_DIFF: Record<string, string> = { ث: "th", ذ: "dh", ص: "s", ض: "d", ط: "t", ظ: "z", ة: "a" };
const MARK: Record<string, string> = { "َ": "a", "ِ": "i", "ُ": "u", "ً": "an", "ٍ": "in", "ٌ": "un" };
const SKIP = new Set(["ْ", "ّ", "ٰ", "ـ", "‌", "‍"]);
const isConsonant = (ch: string | undefined): boolean => !!ch && (ch in LET) && !"ہھه".includes(ch) ;

export function romaniseArabic(text: string, lang: "ar" | "ur"): string {
  const chars = [...text.normalize("NFC")].filter((c) => !SKIP.has(c) || c === "ّ");
  let out = "";
  let prevConsonant = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];
    if (ch === "ّ") { out += out.slice(-1); continue; } // a doubled letter
    if (ch in MARK) { out += MARK[ch]; prevConsonant = false; continue; }
    if (ch === "ا" || ch === "آ") { out += ch === "آ" ? "aa" : i === 0 ? "a" : "a"; prevConsonant = false; continue; }
    if (ch === "ى") { out += "a"; prevConsonant = false; continue; }
    if (ch === "و") { out += prevConsonant || i > 0 ? "u" : "w"; if (!(prevConsonant || i > 0)) prevConsonant = false; else prevConsonant = false; continue; }
    if (ch === "ي" || ch === "ی" || ch === "ے") { out += ch === "ے" ? "e" : i === 0 || next === undefined ? (i === 0 ? "y" : "i") : prevConsonant ? "i" : "y"; prevConsonant = false; continue; }
    const l = (lang === "ar" && AR_DIFF[ch]) || LET[ch];
    if (l !== undefined) {
      // Two consonants side by side: the unwritten short vowel is guessed as "a" (not before the last letter, where it is usually silent).
      if (prevConsonant && next !== undefined) out += "a";
      out += l;
      prevConsonant = isConsonant(ch);
      continue;
    }
    out += ch;
    prevConsonant = false;
  }
  return out;
}

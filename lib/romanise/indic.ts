/**
 * Hindi and Bengali written in Latin letters, the way people write them in a message ("aap kaise hain"), not a
 * scholar's scheme. Each word is split into consonants with the vowel that follows (a written vowel sign, the
 * inherent "a", or none after a virama); then the inherent vowel is dropped where it is not said.
 */
interface Unit { c: string; v: string | null; inherent: boolean }

interface Script {
  consonants: Record<string, string>;
  vowels: Record<string, string>;
  signs: Record<string, string>;
  virama: string;
  nukta?: string;
  /** Signs that follow a unit and add a sound (anusvara, candrabindu, visarga). */
  after: Record<string, string>;
  inherent: string;
}

const HI: Script = {
  consonants: { क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ng", च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "ny", ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n", त: "t", थ: "th", द: "d", ध: "dh", न: "n", प: "p", फ: "ph", ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", व: "v", श: "sh", ष: "sh", स: "s", ह: "h", ळ: "l", "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f", "य़": "y" },
  vowels: { अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo", ऋ: "ri", ए: "e", ऐ: "ai", ओ: "o", औ: "au", ऑ: "o", ऍ: "e" },
  signs: { "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ॅ": "e" },
  virama: "्", nukta: "़",
  after: { "ं": "n", "ँ": "n", "ः": "h" },
  inherent: "a",
};

const BN: Script = {
  consonants: { ক: "k", খ: "kh", গ: "g", ঘ: "gh", ঙ: "ng", চ: "ch", ছ: "chh", জ: "j", ঝ: "jh", ঞ: "n", ট: "t", ঠ: "th", ড: "d", ঢ: "dh", ণ: "n", ত: "t", থ: "th", দ: "d", ধ: "dh", ন: "n", প: "p", ফ: "ph", ব: "b", ভ: "bh", ম: "m", য: "j", র: "r", ল: "l", শ: "sh", ষ: "sh", স: "s", হ: "h", "ড়": "r", "ঢ়": "rh", "য়": "y", ৎ: "t" },
  vowels: { অ: "o", আ: "a", ই: "i", ঈ: "i", উ: "u", ঊ: "u", ঋ: "ri", এ: "e", ঐ: "oi", ও: "o", ঔ: "ou" },
  signs: { "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou" },
  virama: "্", nukta: "়",
  after: { "ং": "ng", "ঁ": "n", "ঃ": "h" },
  inherent: "o",
};

// Letters with a dot below are one letter in the table above; fold the two-code-point forms into them.
const fold = (s: string): string => s.normalize("NFC");

function units(word: string, sc: Script): Unit[] | null {
  const out: Unit[] = [];
  const chars = [...fold(word)];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (sc.vowels[ch] !== undefined) { out.push({ c: "", v: sc.vowels[ch], inherent: false }); continue; }
    if (sc.consonants[ch] !== undefined) {
      let c = sc.consonants[ch];
      if (sc.nukta && chars[i + 1] === sc.nukta) { const joined = sc.consonants[ch + sc.nukta]; if (joined) c = joined; i++; }
      const next = chars[i + 1];
      if (next === sc.virama) { out.push({ c, v: "", inherent: false }); i++; }
      else if (next !== undefined && sc.signs[next] !== undefined) { out.push({ c, v: sc.signs[next], inherent: false }); i++; }
      else out.push({ c, v: sc.inherent, inherent: true });
      continue;
    }
    if (sc.after[ch] !== undefined) {
      const last = out[out.length - 1];
      if (last) last.v = (last.v ?? "") + sc.after[ch];
      else out.push({ c: "", v: sc.after[ch], inherent: false });
      continue;
    }
    return null; // not a word of this script
  }
  return out;
}

/** Whether the unit is said with a vowel once the silent inherent vowels are taken out. */
const said = (u: Unit | undefined, dropped: Set<number>, i: number): boolean => !!u && (u.c === "" || (u.v !== "" && u.v !== null && !dropped.has(i)));

function render(us: Unit[], hindi: boolean): string {
  const dropped = new Set<number>();
  const n = us.length;
  if (n > 1 && us[n - 1].inherent) dropped.add(n - 1);
  // Right to left, so what follows is already decided (samajhna: the vowel after "jh" goes, the one after "m" stays).
  if (hindi) for (let i = n - 2; i >= 1; i--) if (us[i].inherent && said(us[i - 1], dropped, i - 1) && said(us[i + 1], dropped, i + 1)) dropped.add(i);
  return us.map((u, i) => {
    if (u.inherent && dropped.has(i)) return u.c;
    return u.c + (u.v ?? "");
  }).join("");
}

export function romaniseHindi(text: string): string { const u = units(text, HI); return u ? render(u, true) : text; }
export function romaniseBengali(text: string): string { const u = units(text, BN); return u ? render(u, false) : text; }

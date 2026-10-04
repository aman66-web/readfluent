import { tokenize } from "@/lib/reading/sentences";
import type { Key } from "@/lib/reading/keys";
import { keySpans } from "@/lib/reading/keys";

/**
 * Matching every word of a page to the words of its English line (owner, 4 Oct 2026: "every single word, and every phrase that
 * cannot be split into words, gets a colour"). The phone's translator is asked about each English word in turn, marked in
 * square brackets (lib/translate/align.ts), and each answer says which words of the page that English word became. Here
 * the answers are put together: words that point at the same place join into one match (the + story = l'histoire), and
 * the words left over between two matches that sit in the same gap on both sides (in the = le) are matched to each other.
 * Pure: no phone, no network, so the rules can be tested.
 */
export interface Hit { /** Index of the English word (among the English line's words). */ ei: number; /** What the translator put between the brackets, lower case. */ got: string }

const parts = (w: string): string[] => w.split(/['’]/).filter(Boolean);
const same = (tokWord: string, gotWord: string): boolean => tokWord === gotWord || parts(tokWord).includes(gotWord);

/** Where `got` stands among the page's words: the run of words that is it, nearest to where it would be if the lines ran side by side. */
export function findRun(words: readonly string[], got: string, hint: number, free: (i: number) => boolean): [number, number] | null {
  const g = tokenize(got).flatMap((t) => (t.word ? [t.word] : []));
  if (!g.length) return null;
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (let i = 0; i + g.length <= words.length; i++) {
    let ok = true;
    for (let j = 0; j < g.length && ok; j++) ok = free(i + j) && same(words[i + j], g[j]);
    if (!ok) continue;
    const d = Math.abs(i - hint);
    // A word that turns up far from where it would stand is another word that happens to look the same.
    if (d <= Math.max(4, Math.ceil(words.length / 2)) && d < bestD) { best = [i, i + g.length - 1]; bestD = d; }
  }
  return best;
}

class Sets {
  private p: number[];
  constructor(n: number) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(x: number): number { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; }
  join(a: number, b: number): void { this.p[this.find(a)] = this.find(b); }
}

const contiguous = (xs: number[]): boolean => xs.every((x, i) => i === 0 || x === xs[i - 1] + 1);
/** The most words either side of a guessed gap match may have. */
const GAP_MAX = 5;

/**
 * Builds the matches of a page. `hits` are the translator's answers; `fixed` are matches already known (written by hand): their
 * words are not touched. Every returned key says exactly which words it is (`at` in the page, `ea` in the English line), in the order they come in the page.
 */
export function linkKeys(english: string, target: string, hits: readonly Hit[], fixed: readonly Key[] = []): Key[] {
  const ew = tokenize(english).filter((t) => t.word);
  const tw = tokenize(target).filter((t) => t.word);
  const m = ew.length;
  const n = tw.length;
  if (!m || !n) return [];
  const sets = new Sets(m + n);
  const lockedE = new Set<number>();
  const lockedT = new Set<number>();

  // Matches known already: each appearance of a phrase, pairs of appearances in order.
  const eIndex = new Map(ew.map((t, i) => [t.start, i]));
  const tIndex = new Map(tw.map((t, i) => [t.start, i]));
  fixed.forEach((key) => {
    const runs = (spans: Map<number, number>, index: Map<number, number>) => {
      const ix = [...spans].filter(([, kk]) => kk === 0).map(([start]) => index.get(start) as number).filter((v) => v !== undefined).sort((a, b) => a - b);
      const out: number[][] = [];
      for (const i of ix) { const last = out[out.length - 1]; if (last && last[last.length - 1] === i - 1) last.push(i); else out.push([i]); }
      return out;
    };
    const er = runs(keySpans(english, [key], "en"), eIndex);
    const tr = runs(keySpans(target, [key], "w"), tIndex);
    for (let r = 0; r < Math.min(er.length, tr.length); r++) {
      const nodes = [...er[r], ...tr[r].map((j) => m + j)];
      for (const x of nodes.slice(1)) sets.join(nodes[0], x);
      er[r].forEach((i) => lockedE.add(i));
      tr[r].forEach((j) => lockedT.add(j));
    }
  });

  // The translator's answers.
  const words = tw.map((t) => t.word as string);
  for (const h of hits) {
    if (h.ei < 0 || h.ei >= m || lockedE.has(h.ei)) continue;
    const hint = m > 1 ? Math.round((h.ei / (m - 1)) * (n - 1)) : 0;
    const run = findRun(words, h.got, hint, (i) => !lockedT.has(i));
    if (!run) continue;
    for (let j = run[0]; j <= run[1]; j++) sets.join(h.ei, m + j);
  }

  // Groups: a match needs words on both sides, each side in one unbroken run.
  type Group = { e: number[]; t: number[] };
  const by = new Map<number, Group>();
  for (let i = 0; i < m + n; i++) {
    const g = by.get(sets.find(i)) ?? { e: [], t: [] };
    (i < m ? g.e : g.t).push(i < m ? i : i - m);
    by.set(sets.find(i), g);
  }
  const groups: Group[] = [...by.values()].filter((g) => g.e.length && g.t.length && contiguous(g.e) && contiguous(g.t));

  // Words left over in the same gap of both lines belong together.
  const eOwner = new Array<number>(m).fill(-1);
  const tOwner = new Array<number>(n).fill(-1);
  groups.forEach((g, gi) => { g.e.forEach((i) => (eOwner[i] = gi)); g.t.forEach((j) => (tOwner[j] = gi)); });
  const gaps = (owner: number[]) => {
    const out: { key: string; at: number[] }[] = [];
    for (let i = 0; i < owner.length;) {
      if (owner[i] !== -1) { i++; continue; }
      let j = i;
      while (j + 1 < owner.length && owner[j + 1] === -1) j++;
      const left = i === 0 ? "S" : String(owner[i - 1]);
      const right = j === owner.length - 1 ? "E" : String(owner[j + 1]);
      out.push({ key: `${left}|${right}`, at: Array.from({ length: j - i + 1 }, (_, k) => i + k) });
      i = j + 1;
    }
    return out;
  };
  if (groups.length) {
    const eg = gaps(eOwner);
    const tg = gaps(tOwner);
    for (const a of eg) {
      const others = tg.filter((b) => b.key === a.key);
      if (others.length !== 1 || eg.filter((x) => x.key === a.key).length !== 1 || a.key === "S|E") continue;
      const b = others[0];
      if (a.at.length <= GAP_MAX && b.at.length <= GAP_MAX) groups.push({ e: a.at, t: b.at });
    }
  }

  return groups
    .sort((x, y) => x.t[0] - y.t[0])
    .map((g): Key => ({
      w: g.t.map((j) => words[j]).join(" "),
      en: g.e.map((i) => ew[i].word as string).join(" "),
      at: g.t.map((j) => tw[j].start),
      ea: g.e.map((i) => ew[i].start),
    }));
}

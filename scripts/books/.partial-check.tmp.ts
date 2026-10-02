import { readFileSync } from "node:fs";
import { cefrIssues, namesOf } from "../pipeline/cefr";
import { LEVEL_SPECS } from "../pipeline/config";
import { sentences, wordCount } from "../pipeline/text";
const book = JSON.parse(readFileSync(process.argv[2], "utf8"));
const names = namesOf(book.meta.bible);
const KEYS: Record<string, "A"|"B"|"C"> = { A1A2: "A", B1B2: "B", C1C2: "C" };
let bad = 0;
book.beats.forEach((b: any, i: number) => { if (wordCount(b.scene) > 14) { console.log(`FAIL beat ${i+1}: scene ${wordCount(b.scene)} words`); bad++; } });
for (const [id, key] of Object.entries(KEYS)) {
  const spec = LEVEL_SPECS[key]; const seen = new Set<string>();
  book.levels[id].forEach((t: string, i: number) => {
    const w = `${id} p${i+1}`;
    if (seen.has(t)) { console.log(`FAIL ${w}: repeat`); bad++; } seen.add(t);
    if (/\.\.\.|…/.test(t) || /\b(Mr|Mrs|Ms|Dr|St)\./.test(t)) { console.log(`FAIL ${w}: punctuation`); bad++; }
    const n = sentences(t).length;
    if (n !== spec.sentences) { console.log(`FAIL ${w}: ${n} sentences`); bad++; }
    for (const is of cefrIssues(t, key, names)) { console.log(`FLAG ${w}: ${is.message}`); bad++; }
  });
}
console.log(bad ? `${bad} problems` : "pages clean");

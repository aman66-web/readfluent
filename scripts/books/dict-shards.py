#!/usr/bin/env python3
"""
Lists the Spanish words of the hand-written books that have no word card yet and splits them into
shards for whoever writes the cards. Each word comes with one sentence of a book that uses it, so
the card gets the sense it has there.

  python3 scripts/books/dict-shards.py <outdir> [shard_size]

Writes <outdir>/shard-NN.in.json: [{"w": "word", "ctx": "the Spanish sentence", "en": "the English page"}, ...]
Cards are read back by dict-merge.py from <outdir>/shard-NN.out.json: {"word": {"en": "...", "use": "...", "ph": "..."}}.
"""
import glob, json, os, re, sys

out = sys.argv[1]
size = int(sys.argv[2]) if len(sys.argv) > 2 else 230
os.makedirs(out, exist_ok=True)
WORD = re.compile(r"[^\W\d_]+(?:['’][^\W\d_]+)*", re.U)
SENT = re.compile(r"[^.!?]+[.!?]+[\"'”’)\]]*\s*")

have = set()
src = open("lib/preview/spanish.ts", encoding="utf8").read()
have |= set(re.findall(r'^\s*"([^"]+)":\s*\{', src, re.M))
dpath = "lib/preview/books/dictionary.es.json"
if os.path.exists(dpath):
    have |= set(json.load(open(dpath, encoding="utf8")))

first = {}
for f in sorted(glob.glob("lib/preview/books/*/es.json")):
    tr = json.load(open(f, encoding="utf8"))
    en = json.load(open(f.replace("es.json", "en.json"), encoding="utf8"))
    for lv in ("B1B2", "C1C2", "A1A2"):  # richer sentences first, so a word is shown in its fullest sense
        for i, p in enumerate(tr["levels"][lv]):
            for m in SENT.finditer(p["text"]):
                s = m.group(0).strip()
                for w in WORD.findall(s):
                    w = w.lower()
                    if w not in have and (w not in first or len(s) < len(first[w]["ctx"]) and len(s) > 25):
                        first[w] = {"w": w, "ctx": s, "en": en["levels"][lv][i]}
words = sorted(first.values(), key=lambda x: x["w"])
n = 0
for i in range(0, len(words), size):
    n += 1
    json.dump(words[i:i + size], open(os.path.join(out, f"shard-{n:02d}.in.json"), "w", encoding="utf8"), ensure_ascii=False, indent=0)
print(len(words), "words,", n, "shards in", out)

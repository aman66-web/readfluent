#!/usr/bin/env python3
"""Merges the cards written for the shards (see dict-shards.py) into lib/preview/books/dictionary.es.json."""
import glob, json, os, sys

out = sys.argv[1]
path = "lib/preview/books/dictionary.es.json"
dic = json.load(open(path, encoding="utf8")) if os.path.exists(path) else {}
bad = 0
for f in sorted(glob.glob(os.path.join(out, "shard-*.out.json"))):
    for w, c in json.load(open(f, encoding="utf8")).items():
        if isinstance(c, dict) and isinstance(c.get("en"), str) and c["en"].strip() and isinstance(c.get("use"), str) and c["use"].strip():
            card = {"en": c["en"].strip(), "use": c["use"].strip()}
            if isinstance(c.get("ph"), str) and c["ph"].strip():
                card["ph"] = c["ph"].strip()
            dic[w.lower()] = card
        else:
            bad += 1
json.dump(dict(sorted(dic.items())), open(path, "w", encoding="utf8"), ensure_ascii=False, indent=0)
print(len(dic), "cards;", bad, "skipped")

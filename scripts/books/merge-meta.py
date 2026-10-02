#!/usr/bin/env python3
"""
Merges translated book metadata (title, blurb, 20 chapter names) into lib/preview/books-i18n/<lang>.json.
Usage: python3 scripts/books/merge-meta.py <dir with <lang>-A.json / <lang>-B.json> <lang> [<lang>...]
Only entries that are complete (title, blurb, chapters of the same count as the English) replace what is there.
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUT = os.path.join(ROOT, "lib", "preview", "books-i18n")

def english():
    gen = {b["slug"]: b for b in json.load(open(os.path.join(ROOT, "lib/preview/written.generated.json")))}
    n = {}
    for slug in gen:
        f = os.path.join(ROOT, "lib/preview/books", slug, "en.json")
        if os.path.exists(f):
            ch = json.load(open(f))["meta"].get("chapters") or []
            if ch: n[slug] = len(ch)
    return n

def main(src, langs):
    want = english()
    for lang in langs:
        path = os.path.join(OUT, lang + ".json")
        have = json.load(open(path)) if os.path.exists(path) else {}
        took = 0
        for part in ("A", "B"):
            f = os.path.join(src, f"{lang}-{part}.json")
            if not os.path.exists(f):
                continue
            for slug, v in json.load(open(f)).items():
                if slug in want and v.get("t") and v.get("b") and len(v.get("c", [])) == want[slug] and all(v["c"]):
                    have[slug] = {"t": v["t"].strip(), "b": v["b"].strip(), "c": [c.strip() for c in v["c"]]}
                    took += 1
        json.dump(have, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
        print(lang, "took", took, "of", len(want), "->", len(have))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])

#!/usr/bin/env python3
"""
Translates every book's title, blurb and chapter names into one language, offline and free (Argos Translate, an
open-source translator that runs on this machine; no key, no cost, nothing sent anywhere but the first model download).
Writes lib/preview/books-i18n/<lang>.json as { slug: { t: title, b: blurb, c: [chapter names] } }. Resumable: strings
already in the file are kept. Run:  python3 scripts/books/translate-meta.py es fr de ...
Setup once:  python3 -m venv /tmp/argos && /tmp/argos/bin/pip install argostranslate
"""
import json, os, sys, glob
import argostranslate.package as pkg
import argostranslate.translate as tr

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUT = os.path.join(ROOT, "lib", "preview", "books-i18n")

def books():
    gen = {b["slug"]: b for b in json.load(open(os.path.join(ROOT, "lib/preview/written.generated.json")))}
    out = []
    for slug, b in gen.items():
        chapters = []
        f = os.path.join(ROOT, "lib/preview/books", slug, "en.json")
        if os.path.exists(f):
            chapters = json.load(open(f)).get("meta", {}).get("chapters", []) or []
        if not chapters:
            continue  # only the full-length books (with named chapters) are translated; the short 50-page ones wait
        out.append((slug, b["title"], b["blurb"], [c if isinstance(c, str) else c.get("title", "") for c in chapters]))
    return out

def ensure(code):
    if any(l.code == code for l in tr.get_installed_languages()) and tr.get_translation_from_codes("en", code):
        try:
            tr.translate("x", "en", code); return
        except Exception:
            pass
    pkg.update_package_index()
    p = next(x for x in pkg.get_available_packages() if x.from_code == "en" and x.to_code == code)
    pkg.install_from_path(p.download())

def main(codes):
    os.makedirs(OUT, exist_ok=True)
    data = books()
    for code in codes:
        ensure(code)
        path = os.path.join(OUT, code + ".json")
        have = json.load(open(path)) if os.path.exists(path) else {}
        cache = {}
        def T(s):
            s = (s or "").strip()
            if not s: return s
            if s not in cache: cache[s] = tr.translate(s, "en", code).strip()
            return cache[s]
        n = 0
        for slug, title, blurb, chapters in data:
            cur = have.get(slug)
            if cur and cur.get("t") and cur.get("b") and len(cur.get("c", [])) == len(chapters):
                continue
            have[slug] = {"t": T(title), "b": T(blurb), "c": [T(c) for c in chapters]}
            n += 1
            if n % 10 == 0:
                json.dump(have, open(path, "w"), ensure_ascii=False, separators=(",", ":")); print(code, len(have), flush=True)
        json.dump(have, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
        print(code, "done", len(have), flush=True)

if __name__ == "__main__":
    main(sys.argv[1:])

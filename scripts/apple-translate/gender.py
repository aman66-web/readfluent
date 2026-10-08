#!/usr/bin/env python3
"""Spanish only, report only: lists adjectives that may be left masculine about a woman ("Elizabeth ... era guapo").
It looks where the English says "she was/seemed/felt..." (or Mrs/Miss/Lady X was...) and mentions no man, and the Spanish
has a linking verb (era, estaba, parecía...) followed by a word in -o whose -a form appears elsewhere in the books.
An automatic fix was tried on 4 Oct 2026 and reverted: most hits were not about her ("su rostro se puso rojo",
"el lenguaje era hermoso"), adverbs ("demasiado") or gerunds ("leyendo"). These need a human or model proofread.

  python3 scripts/apple-translate/gender.py
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WORK = HERE / "work" / "es"
LEVELS = ["A1A2", "B1B2", "C1C2"]
FEMALE = re.compile(r"\b(?:[Ss]he|(?:Mrs|Miss|Lady|Aunt|Queen) [A-Z]\w+) (?:was|seemed|felt|looked|became|grew|stayed|remained|is|seems|feels)\b")
MALE = re.compile(r"\b(?:he|him|his|himself|they|them|their|Mr|Sir|Captain|Admiral|Colonel|Major|King|Lord|Uncle|Dr|"
                  r"man|men|boy|husband|father|son|brother)\b", re.I)
LINK = r"(?:era|estaba|es|está|fue|parecía|parece|se sentía|se siente|se quedó|se puso|estuvo)"
ADV = r"(?:(?:muy|tan|más|menos|demasiado|bastante|algo|un poco) )?"
PATTERN = re.compile(r"\b(" + LINK + r" " + ADV + r")(\w+o)\b(?:( y )(\w+o)\b)?")
NOT_ADJ = {"como", "pero", "todo", "algo", "poco", "mucho", "tanto", "cuanto", "lo", "nuevo", "hecho", "tiempo", "año",
           "momento", "mundo", "trabajo", "camino", "dinero", "libro", "cuerpo", "pueblo", "campo", "río", "cielo", "suelo",
           "medio", "modo", "caso", "resto", "precio", "éxito", "peligro", "silencio", "invierno", "verano", "otoño"}


def candidates(en_page, es_page, feminine_words):
    """Yields (start, end, old, new) for each masculine adjective that should be feminine on this page."""
    if not FEMALE.search(en_page) or MALE.search(en_page):
        return
    for m in PATTERN.finditer(es_page):
        for g in (2, 4):
            word = m.group(g)
            if not word or word.lower() in NOT_ADJ:
                continue
            fem = word[:-1] + "a"
            if fem.lower() in feminine_words:
                yield m.start(g), m.end(g), word, fem


def main():
    fix = False   # see the note above
    previews = sorted((WORK / "preview").glob("*.json"))
    books = {p.stem: json.loads(p.read_text()) for p in previews}
    feminine_words = {w for b in books.values() for lv in b["levels"].values() for p in lv
                      for w in re.findall(r"\w+a\b", p.lower())}
    total, examples = 0, []
    for slug, book in books.items():
        en = json.loads((ROOT / "lib/preview/books" / slug / "en.json").read_text())["levels"]
        for lv, pages in book["levels"].items():
            for i, page in enumerate(pages):
                found = list(candidates(en[lv][i], page, feminine_words))
                if not found:
                    continue
                total += len(found)
                if len(examples) < 12:
                    examples.append(f"{slug} {lv} p{i + 1}: {page}  ->  " + ", ".join(f"{o}->{n}" for _, _, o, n in found))
                for s, e, _, new in sorted(found, reverse=True):
                    page = page[:s] + new + page[e:]
                pages[i] = page
        if fix:
            (WORK / "preview" / f"{slug}.json").write_text(json.dumps(book, ensure_ascii=False) + "\n")
            for lv, pages in book["levels"].items():
                cache = WORK / f"{slug}.{lv}.json"
                if cache.exists():
                    cache.write_text(json.dumps(pages, ensure_ascii=False))
    print(f"{total} possible masculine adjectives about women (check by hand)")
    print("\n".join(examples))


if __name__ == "__main__":
    main()

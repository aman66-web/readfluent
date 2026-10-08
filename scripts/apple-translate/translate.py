#!/usr/bin/env python3
"""Whole books into <lang> with Apple's on-device translator: writes lib/preview/books/<slug>/<lang>.apple.json.

  python3 scripts/apple-translate/translate.py es                 # all 20 featured books
  python3 scripts/apple-translate/translate.py es persuasion      # just these
Build the app first: scripts/apple-translate/build.sh. Format and rules: scripts/apple-translate/BRIEF.md.
"""
import json
import re
import os
import subprocess
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BOOKS = ROOT / "lib/preview/books"
APP = HERE / "build/AppleTranslate.app/Contents/MacOS/AppleTranslate"
LEVELS = ["A1A2", "B1B2", "C1C2"]
NO_DICT = {"ja", "zh"}
FEATURED = [
    "persuasion", "emma", "a-study-in-scarlet", "the-sign-of-the-four", "the-wonderful-wizard-of-oz",
    "the-time-machine", "one-small-step-a-day", "focus-without-the-noise", "the-science-of-getting-rich",
    "acres-of-diamonds", "the-dhammapada", "tao-te-ching", "walking", "eat-more-plants", "the-histories",
    "the-gallic-war", "on-the-origin-of-species", "the-voyage-of-the-beagle", "sense-and-sensibility",
    "the-adventures-of-sherlock-holmes",
]


def words(text):
    """Same as /[\\p{L}\\p{M}'’]+/gu, lowercased (lib/reading/sentences.ts tokenize)."""
    out, cur = [], []
    for ch in text:
        if unicodedata.category(ch)[0] in "LM" or ch in "'’":
            cur.append(ch)
        elif cur:
            out.append("".join(cur).lower())
            cur = []
    if cur:
        out.append("".join(cur).lower())
    return out


CHUNK = 200     # strings per run of the app
PARALLEL = 1    # apps at once: several at once stall the translator


def run_app(strings, src, dst, work, tag):
    """One run of the app over a few strings, with a watchdog: the translator sometimes stalls, so kill and retry."""
    job, out = work / f"job-{tag}.json", work / f"out-{tag}.json"
    job.write_text(json.dumps({"from": src, "to": dst, "strings": strings}, ensure_ascii=False))
    for attempt in range(3):
        out.unlink(missing_ok=True)
        with open(work / "app.log", "a") as log:
            try:
                subprocess.run([str(APP), "run", str(job), str(out)], stdout=log, stderr=log,
                               env={**os.environ, "CONC": "1"}, timeout=60 + 3 * len(strings))
            except subprocess.TimeoutExpired:
                log.write(f"{tag}: timed out (attempt {attempt + 1})\n")
                continue
        if out.exists():
            result = json.loads(out.read_text())["translations"]
            job.unlink(missing_ok=True)
            out.unlink(missing_ok=True)
            if len(result) == len(strings):
                return result
    raise RuntimeError(f"translator {src}->{dst} failed 3 times on {tag}")


def translate(strings, src, dst, work, tag):
    """Translates a list of strings in chunks, a few apps at once; returns them in order ("" where one failed)."""
    chunks = [strings[i:i + CHUNK] for i in range(0, len(strings), CHUNK)]
    with ThreadPoolExecutor(PARALLEL) as pool:
        parts = pool.map(lambda ic: run_app(ic[1], src, dst, work, f"{tag}-{ic[0]}"), enumerate(chunks))
        return [x for part in parts for x in part]


# Names: names/<slug>.json maps an English name or term to its fixed form per language ({"es": {"Scarecrow": "el Espantapájaros"}}).
# Each is hidden behind an invented name the translator leaves alone, then put back.
# The translator sometimes changes an invented name a little ("Kelnevo" -> "Kelnovo", "xanmidos"): caught by MANGLED.
MANGLED = re.compile(r"\b(?:Zor|Kel|Tar|Bren|Vul|Dax|Quel|Ryn|Sav|Xan)[a-z]*?(?:v[aeiou]k|m[aeiou]d[aeiou]|n[aeiou]v[aeiou]|"
                     r"n[aeiou]c|t[aeiou]r[aeiou])(?:e?s)?\b", re.I)
FAKE = [a + b for b in ("vak", "mido", "nevo", "noc", "tiru") for a in ("Zor", "Kel", "Tar", "Bren", "Vul", "Dax", "Quel", "Ryn", "Sav", "Xan")]
ARTICLES = r"(?:el|la|los|las|al|del)"


def load_names(slug, lang):
    f = HERE / "names" / f"{slug}.json"
    terms = json.loads(f.read_text()).get(lang, {}) if f.exists() else {}
    terms = sorted(terms.items(), key=lambda kv: -len(kv[0]))   # longest first: "Tin Woodman" before "Woodman"
    return [(re.compile(r"\b([Tt]he )?" + re.escape(en) + r"\b"), FAKE[i], form) for i, (en, form) in enumerate(terms)]


def protect(text, names):
    for rx, fake, form in names:
        if form.split(" ")[0] in ("los", "las"):
            # A people or group keeps "the" and gets a plural-looking invented name ("the Zorvaks"), or the
            # translator takes it for one person and the verbs come out singular ("los griegos reparó").
            text = rx.sub(lambda m: (m.group(1) or "") + fake + "s", text)
        else:
            text = rx.sub(fake, text)
    return text


# Spanish words after which a name's own article is dropped ("cincuenta persas", "algunos galos", "sus Budas").
# Not digits: in these books they are mostly years ("en 1834 el Beagle").
NO_ARTICLE_AFTER = (r"(?:dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|"
                    r"cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|cientos|doscientos|trescientos|mil|millones|"
                    r"muchos|muchas|pocos|pocas|algunos|algunas|unos|unas|varios|varias|otros|otras|estos|estas|"
                    r"esos|esas|aquellos|aquellas|sus|mis|tus|nuestros|nuestras|tantos|tantas|cuantos|demasiados|ambos)")


def restore(text, names):
    """Puts the fixed forms back; None if the translator mangled a placeholder (then the page is done without names)."""
    for _, fake, form in names:
        if re.search(fake + r"(?:e?s)?['’]s\b", text, re.I):
            return None
        token = fake + r"(?:e?s)?\b"   # the translator sometimes makes the invented name plural ("Zorvaks")
        article = form.split(" ")[0] in ("el", "la", "los", "las")
        if article:
            # Its own article before the invented name goes: the form brings the right one ("al" -> "a", "del" -> "de").
            text = re.sub(r"\b(?:[Ee]l|[Ll]as?|[Ll]os) (" + token + ")", r"\1", text, flags=re.I)
            text = re.sub(r"\b([Aa])l (" + token + ")", r"\1 \2", text, flags=re.I)
            text = re.sub(r"\b([Dd])el (" + token + ")", r"\1e \2", text, flags=re.I)
            # No article after a number or a word like "algunos": "cincuenta persas", not "cincuenta los persas".
            bare = form.split(" ", 1)[1]
            text = re.sub(r"\b(" + NO_ARTICLE_AFTER + r") " + token, lambda m: m.group(1) + " " + bare, text, flags=re.I)
        text = re.sub(token, lambda m: form, text, flags=re.I)
    if MANGLED.search(text):
        return None
    text = re.sub(r"\b([Aa]) el\b", r"\1l", text)       # a el -> al
    text = re.sub(r"\b([Dd])e el\b", r"\1el", text)     # de el -> del
    text = re.sub(r"([.!?][\"'”’»]?\s+)([a-záéíóúñ])", lambda m: m.group(1) + m.group(2).upper(), text)   # "... ellas. Los persas"
    return text[:1].upper() + text[1:]


ENGLISH = set("the and of to was is he she they his her that with for had were this but not you have from what which would".split())


def looks_english(text):
    w = re.findall(r"[a-z]+", text.lower())
    return len(w) >= 6 and sum(x in ENGLISH for x in w) / len(w) > 0.25


def translate_named(pages, lang, work, tag, names):
    """Pages en -> lang with the book's names fixed; a page whose placeholder came back mangled is redone without them."""
    if not names:
        return translate(pages, "en", lang, work, tag)
    out = [restore(t, names) if t.strip() else "" for t in translate([protect(p, names) for p in pages], "en", lang, work, tag)]
    bad = [i for i, x in enumerate(out) if x is None or looks_english(x)]
    if bad:
        for i, x in zip(bad, translate([pages[i] for i in bad], "en", lang, work, f"{tag}-plain")):
            out[i] = x
        print(f"{tag}: {len(bad)} pages redone without the name list", flush=True)
    # The translator now and then hands a whole page back in English: then one sentence at a time.
    for i in [i for i, x in enumerate(out) if looks_english(x)]:
        sentences = re.findall(r"[^.!?]+[.!?]+[\"'”’]*\s*", pages[i]) or [pages[i]]
        out[i] = " ".join(x.strip() for x in translate([x.strip() for x in sentences], "en", lang, work, f"{tag}-sentences"))
        print(f"{tag}: page {i + 1} done sentence by sentence{' (still English)' if looks_english(out[i]) else ''}", flush=True)
    return out


def gloss(word, text):
    """A short English meaning: 1 to 4 words, no trailing full stop."""
    text = " ".join(text.strip().rstrip(".").split())
    text = " ".join(text.split(" ")[:4])
    # The translator capitalises a lone word ("Abandoned"); keep capitals for "I" and for names it left alone ("Anne").
    if (text[:1].isupper() and text.lower() != word and text != "I" and not text.startswith("I ")
            and not text[1:2].isupper()):
        text = text[:1].lower() + text[1:]
    return text


def main():
    """translate.py <lang> [slug...] [--levels A1A2,B1B2] [--publish]: writes work/<lang>/preview/<slug>.json for
    proofreading; with --publish and all three levels, writes the book file the app serves instead."""
    argv = sys.argv[1:]
    only = LEVELS
    publish = "--publish" in argv   # without it, books go to work/<lang>/preview/ for proofreading, not into the app
    argv = [a for a in argv if a != "--publish"]
    if "--levels" in argv:
        i = argv.index("--levels")
        only = argv[i + 1].split(",")
        del argv[i:i + 2]
    lang, slugs = argv[0], argv[1:] or FEATURED
    work = HERE / "work" / lang
    (work / "preview").mkdir(parents=True, exist_ok=True)
    cache_file = work / "dict.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    for slug in slugs:
        target = BOOKS / slug / f"{lang}.apple.json"
        if target.exists():
            print(f"{slug}: already done", flush=True)
            continue
        t0 = time.time()
        en = json.loads((BOOKS / slug / "en.json").read_text())
        names = load_names(slug, lang)
        levels, n_new = {}, 0
        for lv in only:
            saved = work / f"{slug}.{lv}.json"   # so a stopped run picks up where it was
            pages = en["levels"][lv]
            if saved.exists():
                levels[lv] = json.loads(saved.read_text())
                continue
            done = translate_named(pages, lang, work, f"{slug}-{lv}", names)
            missing = [i for i, x in enumerate(done) if not x.strip()]   # retry blanks once
            if missing:
                for i, x in zip(missing, translate_named([pages[i] for i in missing], lang, work, f"{slug}-{lv}-again", names)):
                    done[i] = x
            if any(not x.strip() for x in done):
                print(f"{slug} {lv}: FAILED, {sum(not x.strip() for x in done)} blank pages", flush=True)
                break
            saved.write_text(json.dumps(done, ensure_ascii=False))
            levels[lv] = done
            n_new += len(done)
        else:
            page_time = time.time() - t0
            book_dict = {}
            if lang not in NO_DICT:
                vocab = sorted({w for lv in levels for p in levels[lv] for w in words(p)})
                new = [w for w in vocab if w not in cache]
                for at in range(0, len(new), CHUNK):   # save as it goes
                    part = new[at:at + CHUNK]
                    for w, m in zip(part, translate(part, lang, "en", work, f"{slug}-words")):
                        cache[w] = gloss(w, m)
                    cache_file.write_text(json.dumps(cache, ensure_ascii=False))
                book_dict = {w: cache[w] for w in vocab if cache.get(w)}
            out = target if publish and list(levels) == LEVELS else work / "preview" / f"{slug}.json"
            out.write_text(json.dumps({"slug": slug, "lang": lang, "levels": levels, "dict": book_dict}, ensure_ascii=False) + "\n")
            speed = f" ({n_new / page_time * 60:.0f}/min)" if n_new else ""
            print(f"{slug}: {n_new} new pages in {page_time:.0f}s{speed}, {len(book_dict)} words, "
                  f"{time.time() - t0:.0f}s total -> {out.relative_to(ROOT)}", flush=True)


if __name__ == "__main__":
    main()

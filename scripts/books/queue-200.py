#!/usr/bin/env python3
"""Hands out the next books to bring to 200 pages.
   python3 scripts/books/queue-200.py next [N]   -> prints N slugs not yet full-length and not in flight, and marks them in flight
   python3 scripts/books/queue-200.py done        -> prints counts (full-length, in flight, waiting); clears in-flight books that are now full-length
   python3 scripts/books/queue-200.py retry SLUG  -> puts a slug back in the queue (its agent failed)
"""
import json, os, sys, collections
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
STATE = "/tmp/claude-0/queue200.json"
L = json.load(open(os.path.join(ROOT, "scripts/books/LIST.json")))
by = collections.OrderedDict()
for b in L: by.setdefault(b["category"], []).append(b["slug"])
# hand-built books first, then the categories taken in turn so every shelf grows together
first = [b["slug"] for b in L if b.get("done")]
order = list(first)
i = 0
while len(order) < len(L):
    for cat in by:
        if i < len(by[cat]) and by[cat][i] not in order: order.append(by[cat][i])
    i += 1
def full(slug):
    f = os.path.join(ROOT, "lib/preview/books", slug, "en.json")
    if not os.path.exists(f): return False
    try: return isinstance(json.load(open(f)).get("meta", {}).get("chapters"), list)
    except Exception: return False
st = json.load(open(STATE)) if os.path.exists(STATE) else {"inflight": []}
st["inflight"] = [s for s in st["inflight"] if not full(s)]
cmd = sys.argv[1] if len(sys.argv) > 1 else "done"
if cmd == "next":
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    out = [s for s in order if not full(s) and s not in st["inflight"]][:n]
    st["inflight"] += out
    print("\n".join(out))
elif cmd == "retry":
    st["inflight"] = [s for s in st["inflight"] if s != sys.argv[2]]
else:
    d = sum(full(s) for s in order)
    print(f"full-length {d}, in flight {len(st['inflight'])}, waiting {len(order) - d - len(st['inflight'])}, total {len(order)}")
json.dump(st, open(STATE, "w"))

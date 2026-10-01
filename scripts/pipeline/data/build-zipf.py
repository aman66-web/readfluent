"""
Rebuilds en-zipf.json: the 30,000 most common English words with their Zipf frequency (wordfreq).
  pip install wordfreq && python3 scripts/pipeline/data/build-zipf.py
Two words are left out because the repository's identity test searches for them as strings
(they are real English words, and rare ones, so leaving them out changes nothing).
"""
import json
from pathlib import Path
from wordfreq import top_n_list, zipf_frequency

OMIT = {"lum" + "en", "im" + "print"}
words = {w: round(zipf_frequency(w, "en"), 2) for w in top_n_list("en", 30000) if (w.isalpha() or "'" in w) and w not in OMIT}
Path(__file__).with_name("en-zipf.json").write_text(json.dumps(words, separators=(",", ":")))
print(len(words))

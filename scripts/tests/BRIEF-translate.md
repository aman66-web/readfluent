# Brief: translate the level-test reading passages

`lib/tests/reading/en.json` holds 60 English passages: `levels.A1 … levels.C2`, 10 each, with `title`, `text` and `keys`
(also `qs` and `write`, which you do not translate: the questions stay in English for every learner).
Learners read your translation as the text of the test, then answer the English questions, say its sentences aloud and
type some of them from dictation. So it must be natural, correct, level-appropriate language a real native speaker would write.

For each language you are given, write `lib/tests/reading/<code>.json`:

```json
{ "lang": "<code>", "levels": { "A1": [ { "title": "...", "text": "...", "keys": ["...", "..."] }, ... 10 items ], "A2": [...], "B1": [...], "B2": [...], "C1": [...], "C2": [...] } }
```

Rules:
- Translate `title` and `text` of every passage, in the same order (passage i of a level translates passage i of English). Keep the meaning,
  every fact, name, number-as-word and event, so that the English questions can still be answered from your text. Keep the level: A1 in
  simple short sentences of everyday words, A2 simple, B1 standard, B2 fluent, C1 sophisticated, C2 literary/dense, as the English is. Do not
  simplify C1/C2 and do not make A1 hard.
- Use the same number of sentences as the English (each English sentence is one sentence of yours). End every sentence with the proper
  mark of the language: `.` `!` `?` for most; `。` `！` `？` for Chinese and Japanese; `।` for Hindi and Bengali; `۔` (and `؟`) for Urdu;
  `.` and `؟` for Arabic. Write numbers as words, no digits, no parentheses, no semicolons, no dialogue labels. Use the language's normal
  alphabet (Hindi in Devanagari, Chinese in simplified characters, Urdu in Urdu script, Arabic in Modern Standard Arabic without
  diacritics, Serbian-style variants not used; Portuguese is Brazilian). Keep names but spell them in the language's script if it is not Latin.
- `keys`: 3 to 5 words from YOUR text that a learner's written answer about the passage would likely use (nouns, verbs, names), copied exactly as
  they appear in your text, in lower case where the language has case. For Chinese and Japanese a key is a word of 1-3 characters
  that appears in the text. For languages that inflect, use the form that appears in your text (a learner may use another form, so prefer
  short common stems/words).
- Work level by level; write each level to a temporary file in your scratchpad if you like, then assemble the final JSON with a script.

Check before you finish (write and run a script): every file parses; 6 levels × 10 passages; every `text` non-empty and
has the same sentence count as the English (split on . ! ? 。 ！ ？ । ۔ ؟ followed by a space or the end); every key occurs in its text (case-insensitive);
no digits in any `text`. Fix anything wrong. Do not edit any other file and do not run git. Report in one or two lines.
Write the translations yourself; do not call any translation service.

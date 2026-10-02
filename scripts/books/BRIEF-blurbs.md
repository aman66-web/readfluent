# Rewriting the blurbs (the "about this book" text)

You are an editor-writer. For each book in your list, rewrite ONLY `meta.blurb` in `lib/preview/books/<slug>/en.json`. Change nothing else in the file (not the bible, beats, pages, or other books). Edit with an exact string replacement of the old blurb (a short python script: read the file text, replace the old blurb string, which appears once as the value of "blurb", with the new one; remember to JSON-escape quotes) so the rest of the file stays byte-for-byte unchanged, and run `python3 -c 'import json;json.load(open(path))'` afterwards to be sure the file is still valid JSON.

Read for each book: its current blurb, its `meta.bible`, and its `beats` (the scene and summary of each beat) so the new blurb is true to the book and specific. Also read its entry in `scripts/books/LIST.json` (title, type, inspiredBy).

## What a great blurb does

The reader sees this before reading, on a phone, deciding whether to spend an evening with the book. It must give a little hit of curiosity and want: they should feel "I need to know what happens" or "I need to know that".

- **The first sentence is the hook, and works alone.** The library shows only its first ~10 words ("A boy raised by wolves, a bear who teaches the La…"). Open with a vivid person in a charged moment, a startling situation, a sharp question or a surprising promise. Never open with the title, "This book", "In a world", or a summary of the genre.
- **Fiction (romance, crime, fantasy-scifi):** a specific character, a want, an obstacle with real stakes, and an unanswered question or a ticking clock that pulls the reader in. Use concrete names, places and objects from the book. Tease the middle, never the ending. Crime: make the puzzle itch. Romance: make the wanting and the obstacle felt. Fantasy/sci-fi: make the strange premise land in one image.
- **Non-fiction (self-help, business-money, history, science, health, religion-spirituality):** a precise, surprising payoff or a question the reader secretly wants answered, then the promise of what they will be able to see, do or understand after reading. Make the problem felt first, then the relief. History: a gripping moment, not a lecture. Science: a "wait, really?" fact or paradox. Self-help/business: a tension the reader recognises in their own life. Religion: respectful, curious, never preachy or comparing traditions. Health: never promise cures or results; promise understanding and small, doable steps.
- **Voice:** warm, confident, human, concrete. Strong verbs and nouns. Short sentences mixed with one longer one. Write like the best back-cover copy, not a summary.
- **Avoid:** clichés and hype words (journey, tapestry, unforgettable, gripping, thrilling, page-turner, must-read, heartwarming, epic, rollercoaster, "discover", "unleash", "in a world", "will they or won't they"), exclamation marks, rhetorical questions in every blurb (use one at most, and not always), spoilers, naming the inspiring book, claims the book does not make, the words page/level/chapter, ratings.
- **Variety:** the nine blurbs next to each other on a shelf must not sound alike. Do not start two the same way.
- **Length:** 25 to 42 words, never more than 45. Two or three sentences. Simple enough for an upper-intermediate (B2) learner of English: no rare words, no long literary sentences. Use only plain punctuation: straight apostrophes, normal commas, full stops and question marks (no ellipsis, no dashes longer than a hyphen, no semicolons).
- Facts must be true to the book. For retold classics, keep the real names and events. Health books: no promises, nothing that sounds like medical advice.

## Report

Reply in two or three lines: how many blurbs you rewrote and anything you could not do. Do not touch git, the app, other files or books outside your list. Keep any scratch files in `/tmp/claude-0/blurbs-<your-category>/`.

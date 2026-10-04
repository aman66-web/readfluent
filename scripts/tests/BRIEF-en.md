# Brief: the reading passages for the level tests (English source)

ReadFluent has 10 tests for each level A1, A2, B1, B2, C1, C2. Each test starts with a reading passage and 4 questions about it.
You write the English source passages. They are later translated into 19 other languages, and the learner reads the
translation, so the passages must translate cleanly.

Write `lib/tests/reading/src/<LEVEL>.json` for each level you are given: a JSON array of exactly 10 objects:

```json
{
  "title": "A short title (2-6 words)",
  "text": "The passage. Plain prose in one paragraph, sentences ending . ! or ? only.",
  "qs": [
    { "q": "A question in English", "o": ["option 0", "option 1", "option 2", "option 3"], "a": 2 },
    ... exactly 4 questions
  ],
  "write": { "prompt": "An English instruction asking the learner to write 1-2 sentences in the language they are learning about the passage", "min": 6 },
  "keys": ["three to five", "words", "from", "the text"]
}
```

## Length and sentences (strict)

| level | sentences | words in `text` | longest sentence |
|---|---|---|---|
| A1 | 4-5 | 28-45 | 8 words |
| A2 | 5-6 | 45-75 | 12 words |
| B1 | 6-7 | 75-110 | 18 words |
| B2 | 7-8 | 110-150 | 24 words |
| C1 | 8-9 | 150-200 | 30 words |
| C2 | 9-10 | 190-260 | 36 words |

The sentences are also read aloud by the learner (speaking) and typed from dictation, so every sentence must stand on its own
(no "He said:" dialogue labels, no lists, no parentheses, no semicolons, no bullet points, no numbers written as digits).
Use only these end marks: . ! ?  Names are fine. Quote marks are fine but rare.

## Level of language

A1: present tense, very common words, "I am / there is / I like". A2: past simple, future with going to, simple connectors.
B1: a mix of tenses, opinions, reasons, simple conditionals. B2: passive, reported speech, abstract ideas, linking words.
C1: nuance, idiom, complex clauses, register. C2: dense, literary or academic prose, subtle irony and implication.

## The 10 passages of a level

Ten different kinds and subjects, none repeating: a day in someone's life, a trip, a message or email, a notice or advert, a short
story with a turn, a description of a place, a news item, an opinion, an explanation of how something works, a memory.
Everyday and culturally neutral (no jokes that need English wordplay, no English idioms at A1-B1, no puns, no culture-bound
holidays or sport rules). People's names may be varied and international. No real living people, brands, politics or religion.

## Questions (exactly 4 per passage)

Comprehension only, answerable from the passage whatever language it is read in. Never ask what a particular word or phrase
"means" or how a word is spelled. Mix: a fact, an order of events, a reason, and (B1 and up) an inference or attitude.
Four options each, one right, three plausible but clearly wrong from the text. Put the right answer at different positions
(spread `a` over 0, 1, 2 and 3 evenly in each passage's four questions; do not always use the same). Keep options short.
At A1 the questions and options must be very simple English too.

## `write` and `keys`

`write.prompt` asks for a short answer about the passage ("Write one or two sentences: where does Maria go, and why?").
`write.min` is the fewest words in a good answer: A1 4, A2 6, B1 8, B2 10, C1 12, C2 14.
`keys` are 3 to 5 content words (nouns, verbs, names) that really appear in `text`, in lower case, exactly as spelled there.

## Check before you finish

Run a script that parses each file and prints, for each passage: sentence count, word count, longest sentence, that every key is
in the text (case-insensitive), that there are 4 questions with 4 options and `a` in 0-3. Fix anything outside the table.
Do not edit any other file and do not run git. Report in two lines when done.

# Topic flashcard decks (one file per language)

You are writing topic decks for ReadFluent, an app where people learn a language by reading books. For each language you are given,
write `/home/user/readfluent/lib/decks/topics/<code>.json`:

```json
{ "lang": "<code>", "topics": { "greetings": [ { "t": "...", "en": "...", "ph": "..." }, ... 25 items ], "numbers": [ ... ], ... } }
```

The 12 topics, with exactly these ids, in this order, EXACTLY 25 phrases each (300 per language), most useful first, no duplicates inside a topic:
1. `greetings`: greetings, goodbyes, politeness, apologies, thanks, introducing yourself, "how are you", asking someone's name
2. `numbers`: counting 1-20, tens, hundred, thousand, first/second, how much / how many, prices, "half", "a few"
3. `time`: days of the week, months, today/tomorrow/yesterday, morning/evening/night, "what time is it", "at five o'clock", "every day", "next week"
4. `food`: restaurant and café phrases, ordering, common foods and drinks in short phrases, "I am hungry/thirsty", allergies and "no meat", the bill
5. `travel`: directions, "where is...", station, airport, ticket, bus, taxi, hotel, booking, "left/right/straight on", passport, lost
6. `shopping`: shops, "how much is this", too expensive, size, colours in short phrases, "I would like...", paying by card, bargaining, receipt
7. `family`: family members, "this is my...", ages, married, children, friends, "do you have brothers or sisters", jobs of relatives
8. `home`: rooms, furniture, chores, "turn on/off the light", rent, neighbours, "make yourself at home", appliances, keys, door
9. `health`: body parts in short phrases, "I feel sick", pain, doctor, pharmacy, medicine, emergency, "call an ambulance", "I need help"
10. `feelings`: happy, sad, tired, angry, afraid, bored, in love, "I like/love/hate", "I am worried", opinions, "I agree / I don't agree"
11. `work`: jobs, office, meeting, school, study, exam, homework, "what do you do", boss, colleague, "I work from home", salary, email
12. `weather`: weather and seasons, hot/cold/rain/snow/wind, "it is sunny", nature, animals, sea, mountains, "what a beautiful day", plans for the weekend

Rules for every phrase
- `t`: the phrase in the language, in its normal script. Short (1 to 9 words), natural, polite, standard language (no slang, no dialect).
  Spanish is neutral Latin American; Portuguese is Brazilian; Chinese is Mandarin in Simplified characters; Arabic is Modern Standard Arabic.
- `en`: its English meaning, natural and short. For the language `en` (English itself) the deck is for people who speak another language:
  `t` is the English phrase and `en` is a short plain-English note of when you say it (for example "to ask someone to repeat").
- `ph`: how to say it, for an English speaker: a simple respelling (stressed syllable in CAPITALS) for Latin-script languages; for other scripts use the
  standard romanisation (pinyin with tone marks for Chinese, romaji for Japanese, romanisation for Korean, Devanagari/Bengali/Urdu/Arabic/Cyrillic/Ukrainian
  into Latin letters). For `en` itself, an empty string unless the sound is hard to guess.
- Mostly full useful phrases, a few single everyday words where natural. Every card must be correct, natural and something a beginner really says or needs.
- Valid JSON only; straight quotes, no trailing commas.

When done run:
`python3 -c "import json;d=json.load(open('/home/user/readfluent/lib/decks/topics/<code>.json'));T=d['topics'];print(list(T)==['greetings','numbers','time','food','travel','shopping','family','home','health','feelings','work','weather'], [len(v) for v in T.values()], all(x['t'].strip() and x['en'].strip() for v in T.values() for x in v), all(len({x['t'] for x in v})==len(v) for v in T.values()))"`
and confirm it prints `True [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25] True True` (fix and re-run until it does). Do not edit any other file. Do not run git. Reply in one line.

import type { Item } from "./engine";

/**
 * Placement questions for English: ten for each level, A1 to C2, mixing grammar,
 * vocabulary and short reading. Written once, by hand, offline (no model runs in the app).
 * Each has exactly one answer a teacher would accept; a question that two people could
 * argue about does not belong here. These are test content, so they stay in English.
 *
 * Other languages get their own bank (`bank-<code>.ts`) when their books exist.
 */
const q = (id: string, level: number, kind: Item["kind"], prompt: string, options: string[], answer: number, passage?: string): Item =>
  ({ id, level, kind, prompt, options, answer, ...(passage ? { passage } : {}) });

export const BANK_EN: readonly Item[] = [
  /* ── A1 ── */
  q("a1-1", 0, "grammar", "She ___ a student.", ["are", "is", "am", "be"], 1),
  q("a1-2", 0, "grammar", "I ___ coffee every morning.", ["drinks", "drinking", "drink", "drunk"], 2),
  q("a1-3", 0, "grammar", "There ___ two books on the table.", ["is", "am", "be", "are"], 3),
  q("a1-4", 0, "vocabulary", "What is the opposite of “big”?", ["small", "tall", "fast", "old"], 0),
  q("a1-5", 0, "grammar", "___ is your name?", ["Who", "What", "Where", "When"], 1),
  q("a1-6", 0, "grammar", "He ___ to school by bus.", ["go", "going", "gone", "goes"], 3),
  q("a1-7", 0, "vocabulary", "Which room do you sleep in?", ["the kitchen", "the garden", "the bedroom", "the garage"], 2),
  q("a1-8", 0, "grammar", "“Is this your bag?” “Yes, it ___.”", ["is", "are", "am", "does"], 0),
  q("a1-9", 0, "grammar", "We ___ from Spain.", ["am", "is", "be", "are"], 3),
  q("a1-10", 0, "grammar", "My brother ___ two children.", ["have", "has", "having", "haves"], 1),

  /* ── A2 ── */
  q("a2-1", 1, "grammar", "Yesterday I ___ to the market.", ["go", "gone", "went", "going"], 2),
  q("a2-2", 1, "grammar", "She is taller ___ her sister.", ["than", "that", "then", "as"], 0),
  q("a2-3", 1, "grammar", "I have lived here ___ 2019.", ["for", "during", "since", "from"], 2),
  q("a2-4", 1, "grammar", "If it rains tomorrow, we ___ at home.", ["stay", "stayed", "would stay", "will stay"], 3),
  q("a2-5", 1, "grammar", "How ___ water do you drink in a day?", ["many", "much", "more", "lot"], 1),
  q("a2-6", 1, "grammar", "I'm looking ___ my keys. Have you seen them?", ["at", "for", "to", "up"], 1),
  q("a2-7", 1, "vocabulary", "A person who cooks food in a restaurant is a ___.", ["pilot", "doctor", "chef", "driver"], 2),
  q("a2-8", 1, "grammar", "She ___ TV when I called her.", ["watched", "watches", "has watched", "was watching"], 3),
  q("a2-9", 1, "grammar", "There isn't ___ milk in the fridge.", ["some", "any", "a", "many"], 1),
  q("a2-10", 1, "grammar", "You ___ wear a seat belt in the car. It's the law.", ["may", "can", "must", "might"], 2),

  /* ── B1 ── */
  q("b1-1", 2, "grammar", "If I ___ more time, I would learn the piano.", ["have", "had", "will have", "would have"], 1),
  q("b1-2", 2, "grammar", "The film was so boring that I nearly ___ asleep.", ["fall", "fallen", "falling", "fell"], 3),
  q("b1-3", 2, "grammar", "She asked me where I ___ the day before.", ["was", "am", "were", "had been"], 3),
  q("b1-4", 2, "grammar", "I'm not used to ___ up so early.", ["get", "getting", "got", "be getting"], 1),
  q("b1-5", 2, "vocabulary", "The company decided to ___ the meeting because the manager was ill.", ["prevent", "predict", "postpone", "pretend"], 2),
  q("b1-6", 2, "grammar", "I wish I ___ speak French.", ["can", "will", "should", "could"], 3),
  q("b1-7", 2, "grammar", "The book, ___ was written in 1950, is still popular.", ["who", "what", "whom", "which"], 3),
  q("b1-8", 2, "grammar", "By the time we arrived, the film ___.", ["already started", "has already started", "had already started", "was already starting"], 2),
  q("b1-9", 2, "reading", "Why did Tom take the bus today?", ["He was late.", "He doesn't like walking.", "His car broke down.", "Because of the weather."], 3,
    "Tom usually walks to work, but today he took the bus because it was raining heavily."),
  q("b1-10", 2, "vocabulary", "She's very ___ — she never stops talking.", ["silent", "shy", "talkative", "quiet"], 2),

  /* ── B2 ── */
  q("b2-1", 3, "grammar", "Had I known about the traffic, I ___ earlier.", ["would leave", "would have left", "will leave", "left"], 1),
  q("b2-2", 3, "grammar", "He denied ___ the window.", ["to break", "break", "breaking", "to have break"], 2),
  q("b2-3", 3, "vocabulary", "The new law has had a significant ___ on small businesses.", ["affect", "affection", "effective", "effect"], 3),
  q("b2-4", 3, "grammar", "I'd rather you ___ smoke in here.", ["don't", "didn't", "won't", "not"], 1),
  q("b2-5", 3, "grammar", "She is said ___ the best surgeon in the country.", ["be", "to be", "being", "that is"], 1),
  q("b2-6", 3, "grammar", "Despite ___ hard, he failed the test.", ["he studied", "of studying", "to study", "studying"], 3),
  q("b2-7", 3, "reading", "What did the researchers mean?", ["The study proved the treatment works.", "The study was too expensive.", "The findings may not be reliable yet.", "The researchers disagreed with each other."], 2,
    "Although the results of the study were promising, the researchers warned that the sample was too small to draw firm conclusions."),
  q("b2-8", 3, "vocabulary", "His explanation was so ___ that nobody could follow it.", ["convoluted", "concise", "straightforward", "transparent"], 0),
  q("b2-9", 3, "grammar", "Not only ___ late, but he also forgot the documents.", ["he arrived", "he did arrive", "did he arrive", "arrived he"], 2),
  q("b2-10", 3, "grammar", "We need to come up ___ a better plan.", ["to", "for", "on", "with"], 3),

  /* ── C1 ── */
  q("c1-1", 4, "grammar", "Scarcely had we sat down ___ the music began.", ["than", "when", "that", "then"], 1),
  q("c1-2", 4, "vocabulary", "The minister's remarks were deliberately ___, leaving everyone unsure of her position.", ["explicit", "blunt", "ambiguous", "emphatic"], 2),
  q("c1-3", 4, "grammar", "It is high time the government ___ action.", ["takes", "took", "will take", "has taken"], 1),
  q("c1-4", 4, "vocabulary", "She has a remarkable ___ for languages.", ["attitude", "altitude", "amplitude", "aptitude"], 3),
  q("c1-5", 4, "grammar", "Under no circumstances ___ the door be left unlocked.", ["is", "will", "does", "should"], 3),
  q("c1-6", 4, "reading", "What is the author's prose like?", ["Difficult and obscure throughout.", "Simple in appearance but layered in meaning.", "Plain and without depth.", "Full of long, complicated sentences."], 1,
    "The author's prose is deceptively simple: beneath its plain surface lies a web of allusions that rewards repeated reading."),
  q("c1-7", 4, "grammar", "He's not exactly poor — he just lives ___ his means.", ["behind", "against", "across", "beyond"], 3),
  q("c1-8", 4, "vocabulary", "The negotiations reached a ___ when neither side would compromise.", ["shortcut", "landmark", "deadlock", "backlog"], 2),
  q("c1-9", 4, "grammar", "I'd have called you had I ___ your number.", ["knew", "known", "have known", "would know"], 1),
  q("c1-10", 4, "vocabulary", "His ___ attitude to deadlines frustrated his colleagues.", ["cordial", "candid", "cavalier", "cautious"], 2),

  /* ── C2 ── */
  q("c2-1", 5, "grammar", "He was loath ___ the matter any further.", ["pursuing", "to pursue", "that he pursue", "pursue"], 1),
  q("c2-2", 5, "vocabulary", "The professor's lecture was a masterpiece of ___: not a word was wasted.", ["contrition", "convention", "concision", "contention"], 2),
  q("c2-3", 5, "vocabulary", "The two theories are not mutually exclusive; if anything, they ___ one another.", ["compliment", "complement", "complicate", "compete"], 1),
  q("c2-4", 5, "reading", "What does the writer claim about the footnote?", ["It decorates the page without adding meaning.", "It repeats the main argument more clearly.", "It quietly challenges the main text.", "It corrects typing errors."], 2,
    "Far from being a mere ornament, the footnote performs a quietly subversive function, undermining the confident assertions of the main text."),
  q("c2-5", 5, "vocabulary", "His prose style, at once ___ and ornate, resists easy imitation.", ["prolix", "florid", "opulent", "laconic"], 3),
  q("c2-6", 5, "vocabulary", "The company's fortunes ___ dramatically after the scandal broke.", ["waned", "wound", "waxed", "wandered"], 0),
  q("c2-7", 5, "grammar", "Seldom ___ such a clear example of the phenomenon.", ["one witnessed", "does one witnessed", "one has witnessed", "has one witnessed"], 3),
  q("c2-8", 5, "vocabulary", "The diplomat's ___ reply defused the tension without conceding anything.", ["sanguine", "truculent", "emollient", "vehement"], 2),
  q("c2-9", 5, "grammar", "It behoves us ___ the consequences before acting.", ["considering", "consider", "to considering", "to consider"], 3),
  q("c2-10", 5, "vocabulary", "The data cannot bear the weight placed on them, so the conclusions are at best ___.", ["robust", "incontrovertible", "cogent", "tenuous"], 3),
];

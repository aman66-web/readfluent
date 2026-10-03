/**
 * A picture for a page, drawn from its scene caption (the one-line description each beat carries) and nothing
 * else: no image is fetched, made by a model or stored. The caption is read for a setting (sea, night, a street,
 * a room…), the time of day or weather, and the things and people it names; the same caption and seed always draw
 * the same picture, and a different page draws a different one. Pure rules here; components/ScenePhoto.tsx draws them.
 */

export type Setting = "sea" | "street" | "room" | "forest" | "mountain" | "desert" | "field" | "road" | "castle" | "space" | "cave" | "lab" | "garden" | "water";
export type Sky = "day" | "dawn" | "dusk" | "night" | "storm" | "snow";
export type Motif =
  | "ship" | "house" | "door" | "window" | "key" | "lamp" | "candle" | "book" | "letter" | "clock" | "coin" | "chest" | "heart" | "ring" | "crown" | "sword"
  | "cup" | "table" | "bed" | "hat" | "cat" | "dog" | "horse" | "bird" | "fish" | "tree" | "flower" | "fire" | "hearth" | "bridge" | "cart" | "train" | "bell" | "mirror"
  | "ladder" | "rope" | "bag" | "brain" | "shoe" | "apple" | "ghost" | "coffin" | "cross" | "flask" | "star" | "map" | "sun" | "tent" | "camel" | "plane" | "phone"
  | "scale" | "chart" | "pen" | "lock" | "mask" | "wine" | "bread" | "tower" | "leaf" | "drop" | "eye" | "hand";

export interface Figure { kind: "person" | "child" | "group"; x: number }
export interface Thing { motif: Motif; x: number; scale: number }
export interface Scene { setting: Setting; sky: Sky; hue: number; things: Thing[]; people: Figure[]; seed: number; stars: boolean; rain: boolean; snow: boolean }

/** A small stable hash of a string. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** What each word in a caption stands for. Order is the order of priority when a caption names several. */
const SETTINGS: readonly [Setting, RegExp][] = [
  ["space", /\b(planet|galaxy|universe|stars?|telescope|comet|moon surface|orbit|cosmos|nebula|asteroid)\b/],
  ["sea", /\b(sea|ocean|ship|boat|harbou?r|shore|beach|waves?|sail(?:s|ors?)?|deck|island|reef|coast|lighthouse|whale|steamer|raft|voyage)\b/],
  ["cave", /\b(cave|tunnel|mine|underground|cellar|crypt|dungeon|tomb)\b/],
  ["desert", /\b(desert|sand|dunes?|camels?|caravan|oasis)\b/],
  ["room", /\b(courtroom|trial|judge|jury|dock)\b/],
  ["castle", /\b(castle|palace|throne|king|queen|prince|princess|fortress|tower|knight|emperor)\b/],
  ["lab", /\b(lab|laboratory|experiment|chemist|flask|microscope|atom|machine|invent\w*|equation|blackboard|classroom)\b/],
  ["mountain", /\b(mountains?|cliff|peak|summit|hill(?:side|s)?|climb\w*|glacier|alps|headland|valley)\b/],
  ["forest", /\b(forest|woods?|jungle|trees?|grove|moor|swamp|marsh)\b/],
  ["garden", /\b(garden|flowers?|meadow|orchard|lawn|park|hedge|roses?|farm|barn|vineyard)\b/],
  ["field", /\b(field|fields|harvest|wheat|grass|countryside|village|cottage|shepherd|sheep)\b/],
  ["road", /\b(road|path|lane|journey|travel\w*|carriage|coach|cab|cart|train|station|bridge|highway|car|bus|plane|airport|map|street corner)\b/],
  ["room", /\b(room|kitchen|parlou?r|bedroom|study|desk|counter|inside|workbench|sofa)\b/],
  ["street", /\b(city|street|town|square|market|shop|stall|bank|inn|pub|church|hospital|courtyard|crowd|office|school|gate|london|paris|rome|babylon|pavement|window sign)\b/],
  ["room", /\b(room|house|home|kitchen|bedroom|study|library|desk|table|sofa|fire|fireplace|hall|parlou?r|bed|chair|lamp|candle|inside|wall|door|stairs?|attic|letter|diary|notebook|calendar|floor|shelf|bench|screen|laptop|pillow)\b/],
  ["water", /\b(river|lake|pond|stream|water|fountain|canal)\b/],
];

const SKIES: readonly [Sky, RegExp][] = [
  ["snow", /\b(snow\w*|winter|ice|icy|frost\w*|blizzard|cold)\b/],
  ["storm", /\b(storm\w*|thunder|lightning|rain\w*|drizzle|fog\w*|mist\w*|clouds?|grey|gloom\w*|squall|hurricane)\b/],
  ["night", /\b(night|midnight|moon\w*|candle\w*|lamplight|stars?|lantern|bedtime|asleep|owl)\b/],
  ["dusk", /\b(sunset|dusk|evening|twilight|sundown)\b/],
  ["dawn", /\b(dawn|sunrise|morning|daybreak|breakfast|early light)\b/],
];

const THINGS: readonly [Motif, RegExp][] = [
  ["ship", /\b(ship|boat|steamer|vessel|sail\w*|raft|yacht|submarine|nautilus|galley)\b/],
  ["train", /\b(train|station|railway|locomotive)\b/],
  ["plane", /\b(plane|aeroplane|airport|flight|flying)\b/],
  ["cart", /\b(carriage|coach|cab|cart|wagon|caravan|car|bus|van|taxi)\b/],
  ["horse", /\b(horse\w*|pony|rides?|riding)\b/],
  ["camel", /\b(camels?)\b/],
  ["cat", /\b(cats?|kitten|tiger|lion)\b/],
  ["dog", /\b(dogs?|terrier|hound|puppy|wolf|wolves|fox)\b/],
  ["bird", /\b(bird\w*|owl|crow|raven|dove|eagle|swan|hen|parrot|wings?)\b/],
  ["fish", /\b(fish\w*|whale|shark|octopus|squid|reef)\b/],
  ["house", /\b(house|cottage|home|hut|farmhouse|manor|inn)\b/],
  ["tower", /\b(tower|castle|lighthouse|steeple|palace)\b/],
  ["door", /\b(door\w*|gate|entrance|threshold|doorway)\b/],
  ["window", /\b(window\w*|glass pane|curtain\w*)\b/],
  ["key", /\b(keys?)\b/],
  ["lock", /\b(lock\w*|safe|vault|padlock)\b/],
  ["candle", /\b(candles?|taper)\b/],
  ["lamp", /\b(lamps?|lantern\w*|lamplight|torch)\b/],
  ["fire", /\b(fires?|fireplace|firelit|hearth|flames?|blaze|campfire|bonfire|stove)\b/],
  ["book", /\b(books?|diary|notebook|library|pages?|reads?|reading|journal|tablet|scroll|manuscript)\b/],
  ["letter", /\b(letters?|envelope|note|message|telegram|post|mail|card)\b/],
  ["pen", /\b(pen|writes?|writing|pencil|ink|signs?|signature)\b/],
  ["map", /\b(map|chart|globe|atlas|compass)\b/],
  ["clock", /\b(clocks?|watch|alarm|hours?|calendar|time|timer|bedside)\b/],
  ["coin", /\b(coins?|gold|silver|money|purse|wage|pay\w*|savings?|fortune|treasure|cash|wallet)\b/],
  ["chest", /\b(chest|box|trunk|parcel|crate|casket|suitcase|package)\b/],
  ["bag", /\b(bags?|sack|basket|baskets|satchel|backpack|luggage)\b/],
  ["scale", /\b(scales?|balance|weigh\w*|budget|ledger|accounts?)\b/],
  ["chart", /\b(graph|chart|plan|table of|diagram|numbers|statistics|percent)\b/],
  ["heart", /\b(hearts?|love\w*|kiss\w*|wedding|bride|romance|sweetheart|marry|marriage|proposal)\b/],
  ["ring", /\b(rings?|jewel\w*|diamond|necklace|pearl)\b/],
  ["crown", /\b(crown|king|queen|throne|royal|prince|princess)\b/],
  ["sword", /\b(sword\w*|knife|dagger|spears?|battle|weapon|armou?r|soldiers?|army|duel|fight\w*|slings?)\b/],
  ["cup", /\b(cups?|tea|coffee|mug|teapot|kettle|breakfast|drinks?|milk|glass of water)\b/],
  ["wine", /\b(wine|wineglass|beer|ale|whisky|brandy|champagne|drunk|toast)\b/],
  ["bread", /\b(bread|food|meal|dinner|supper|feast|lunch|soup|cake|plate|eats?|eating|kitchen)\b/],
  ["apple", /\b(apples?|fruit|vegetables?|berries|orange|pear|plants?|salad|diet)\b/],
  ["table", /\b(table|desk|counter|bench)\b/],
  ["bed", /\b(bed|bedroom|pillow|sleeps?|sleeping|asleep|nap|blanket|bedside)\b/],
  ["hat", /\b(hats?|cap|bonnet|coat|cloak|scarf|gloves?|cane|umbrella|spectacles)\b/],
  ["mask", /\b(mask|disguise|actor|stage|theatre|theater|mirror\w*)\b/],
  ["mirror", /\b(mirrors?|reflect\w*|looking glass)\b/],
  ["tree", /\b(trees?|oak|branch\w*|forest|woods?|grove|orchard)\b/],
  ["flower", /\b(flowers?|roses?|petals?|garden|blossom\w*|bouquet|daisy|tulip)\b/],
  ["leaf", /\b(leaf|leaves|grass|plant|seed\w*|green|moss)\b/],
  ["bridge", /\b(bridge|river|crossing|ford|canal)\b/],
  ["bell", /\b(bells?|church|chapel|clock tower|steeple|ring(?:s|ing) out)\b/],
  ["ladder", /\b(ladders?|stairs?|steps|staircase|climbs?|climbing)\b/],
  ["rope", /\b(rope|chain|knot|cable|wire|tied|bound)\b/],
  ["brain", /\b(brain|mind|thought\w*|think\w*|memory|idea|focus|learn\w*|study|studies|puzzle|dream\w*)\b/],
  ["shoe", /\b(shoes?|boots?|run\w*|walk\w*|jog\w*|exercise|race|feet|foot|marathon|gym|weights?|lift\w*|stretch\w*)\b/],
  ["ghost", /\b(ghosts?|spirit|phantom|monster|creature|vampire|eyes shine|fog creeps)\b/],
  ["coffin", /\b(coffin|grave(?:s|yard|stone)?|tomb|funeral|corpse|skull|cemetery)\b/],
  ["cross", /\b(doctor|hospital|nurse|medicine|pills?|medical|clinic|patient|health|bandage|syringe)\b/],
  ["flask", /\b(flask|chemist\w*|potion|experiment|laborator\w*|test tube|microscope|science|scientist)\b/],
  ["star", /\b(stars?|starry|planets?|telescope|galaxy|comet|universe|sky)\b/],
  ["sun", /\b(sun|sunlight|sunshine|sunny|sunrise|sunset|daylight)\b/],
  ["tent", /\b(tent|camp\w*|campfire|caravan)\b/],
  ["phone", /\b(phones?|screen|computer|laptop|app|online|email|tablet device|keyboard|text message|tv|television)\b/],
  ["drop", /\b(water|drops?|rain|tears?|weeps?|wets?|bucket|well|swim\w*|bath)\b/],
  ["eye", /\b(eyes|stares?|gaze\w*|glances?|spy|spies)\b/],
  ["hand", /\b(hands?|handshake|grabs?|fingers?)\b/],
];

const PEOPLE = /\b(sisters?|daughters?|sons?|guests?|couples?|gentlemen|ladies|officers?|girls|boys|servants|brothers|mothers|fathers|parents|passengers|travellers|man|men|woman|women|he|she|they|girl|boy|child|children|lady|gentleman|sailor|sailors|doctor|landlady|driver|stranger|friend|friends|mother|father|sister|brother|family|detective|policeman|guard|farmer|merchant|servant|clerk|teacher|student|king|queen|prince|princess|lord|captain|bride|groom|husband|wife|baby|neighbou?r|crowd|people|villagers|figures?|diver|divers|workers?|runner|walker|reader|traveller|player|artist|writer|thief|spy|monk|priest|nun|hunter|fisherman|knight|soldier|soldiers|[A-Z][a-z]+ (?:and|with|looks|walks|sits|stands|reads|holds|asks|says|tells|smiles|laughs|waits|writes|opens|picks|takes|turns|runs|climbs|kneels|weeps|hurries|talks|listens|sleeps|sips|drinks|stops|watches|enters|leaves|stares|speaks|lies|works|plays|cooks|eats|follows|calls|nods|wakes|hides|pleads))\b/i;
const CHILD = /\b(girl|boy|child|children|baby|kitten|puppy|little)\b/i;
const GROUP = /\b(crowd|people|villagers|friends|family|sailors|soldiers|men|women|workers|divers|children|guests|neighbou?rs|passengers|students|they|two|three|four|together|figures)\b/i;

const first = <T,>(table: readonly [T, RegExp][], text: string): T | null => {
  for (const [k, re] of table) if (re.test(text)) return k;
  return null;
};

const DRY_BY_SEED: readonly Setting[] = ["field", "garden", "road", "street"];
const INDOOR: readonly Motif[] = ["table", "bed", "book", "letter", "pen", "cup", "lamp", "candle", "phone", "chart", "scale", "mirror", "clock", "chest", "bread", "brain", "hearth", "window", "door", "wine"];

/** Reads a caption and decides the picture: where it is, the sky, and what and who is in it. `seed` varies pages whose captions are alike. */
export function composeScene(caption: string, seed: string): Scene {
  const text = ` ${caption} `.toLowerCase();
  const h = hash(`${seed}|${caption}`);
  const bookHue = hash(seed.split(":")[0]) % 360;
  const matched = first(SETTINGS, text);

  // The things the caption names, in the order it names them: at most three, the first the biggest.
  const found: { motif: Motif; at: number }[] = [];
  for (const [motif, re] of THINGS) {
    const m = re.exec(text);
    if (m) found.push({ motif, at: m.index });
  }
  found.sort((a, b) => a.at - b.at);
  const picked: Motif[] = [];
  for (const f of found) {
    // Skip a motif that only repeats the setting (a sea picture does not need "water" too).
    if ((matched === "sea" && (f.motif === "drop" || f.motif === "fish")) && picked.length > 0) continue;
    if (!picked.includes(f.motif)) picked.push(f.motif);
    if (picked.length >= 3) break;
  }
  // No setting word: indoors when the caption names an indoor thing, else a plain dry place (never water or mountains).
  const setting: Setting = matched ?? (picked.some((m) => INDOOR.includes(m)) ? "room" : DRY_BY_SEED[h % DRY_BY_SEED.length]);
  const sky: Sky = first(SKIES, text) ?? (setting === "space" || setting === "cave" ? "night" : (["day", "day", "dawn", "dusk", "day"] as const)[(h >>> 3) % 5]);
  // A hearth, not a campfire, indoors.
  if (setting === "room" || setting === "lab") for (let i = 0; i < picked.length; i++) if (picked[i] === "fire") picked[i] = "hearth";

  const slots = [150, 290, 60, 340];
  const things: Thing[] = picked.map((motif, i) => ({ motif, x: slots[i] + ((h >>> (7 + i)) % 24) - 12, scale: i === 0 ? 1.15 : 0.8 }));

  const people: Figure[] = [];
  if (PEOPLE.test(caption)) {
    const kind: Figure["kind"] = GROUP.test(caption) ? "group" : CHILD.test(caption) ? "child" : "person";
    people.push({ kind, x: things.length > 1 ? 215 + ((h >>> 11) % 30) : 235 + ((h >>> 11) % 40) });
  }
  return { setting, sky, hue: bookHue, things, people, seed: h, stars: sky === "night" || setting === "space", rain: sky === "storm" && /rain|storm|drizzle|thunder/.test(text), snow: sky === "snow" };
}

/** The sky's colours (top, bottom) for a time of day, tinted a little by the book's hue. */
export function skyColours(sky: Sky, hue: number): [string, string] {
  const t = (hue % 40) - 20;
  switch (sky) {
    case "night": return [`hsl(${228 + t / 2} 48% 17%)`, `hsl(${236 + t / 2} 42% 30%)`];
    case "dusk": return [`hsl(${262 + t / 2} 46% 44%)`, `hsl(${22 + t / 2} 90% 70%)`];
    case "dawn": return [`hsl(${196 + t / 2} 70% 78%)`, `hsl(${34 + t / 2} 95% 86%)`];
    case "storm": return [`hsl(${214 + t / 3} 14% 42%)`, `hsl(${210 + t / 3} 14% 66%)`];
    case "snow": return [`hsl(${208 + t / 3} 34% 80%)`, `hsl(${204 + t / 3} 40% 94%)`];
    default: return [`hsl(${198 + t / 2} 76% 70%)`, `hsl(${192 + t / 2} 80% 90%)`];
  }
}

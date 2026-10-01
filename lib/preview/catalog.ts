/**
 * TEMPORARY. A preview slice so the app can be looked at before the content
 * pipeline exists (DECISIONS.md, "Preview slice"): one book, twelve scenes, three
 * levels. It is compiled into the app, which CLAUDE.md forbids for real content —
 * M1 replaces it with JSON served from storage, and this folder is then deleted.
 *
 * The text is an original retelling written for this preview, not a quotation.
 * Page counts are NOT the real 50/100/200: every length opens this same twelve-
 * page sample, and the reader says so.
 */
import { type CategoryId, type LevelId } from "@/lib/content/limits";

export interface Scene { n: number; caption: string }
export interface PreviewPage { n: number; text: string; scene: number }
export interface PreviewBook {
  slug: string;
  title: string;
  author: string;
  kind: "classic" | "inspired";
  category: CategoryId;
  blurb: string;
  scenes: Scene[];
  /** The preview text, by level: one string per scene. */
  text: Record<LevelId, string[]>;
}

const PRIDE_SCENES = [
  "A rich newcomer", "The news at Longbourn", "The ball", "“Tolerable”", "A proud man, laughed at", "Jane and Bingley",
  "Mr Collins", "Mr Wickham", "The proposal", "The letter", "Pemberley", "Happy endings",
];

export const PREVIEW_BOOKS: PreviewBook[] = [
  {
    slug: "pride-and-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    kind: "classic",
    category: "romance",
    blurb: "Elizabeth Bennet has no plans to like the proud Mr Darcy. He has no plans to fall in love with her. Both are wrong about a great deal.",
    scenes: PRIDE_SCENES.map((caption, i) => ({ n: i + 1, caption })),
    text: {
      A1A2: [
        "Long ago in England, a rich man came to live near the Bennet family. Everyone in the town talked about him. Mrs Bennet had five daughters, and she wanted a rich husband for each one.",
        "Mrs Bennet ran to tell her husband the news. \"A rich man has taken Netherfield House! His name is Mr Bingley.\" Mr Bennet smiled. He liked to listen to his wife, but he never hurried.",
        "Soon there was a ball in the town. Mr Bingley came with his sisters and his tall, quiet friend, Mr Darcy. Bingley was kind and happy. Darcy was rich, but he did not smile once.",
        "Mr Bingley danced with Jane, the oldest Bennet girl. Elizabeth, the second sister, sat near the wall. Mr Darcy looked at her and said, \"She is not pretty enough for me.\" Elizabeth heard every word.",
        "Elizabeth was not sad. She laughed and told the story to her friends. \"I will never like that proud man,\" she said. From that night, she watched Mr Darcy with sharp, curious eyes.",
        "Jane and Mr Bingley met often, and they became very close. But Jane was shy, and her feelings were quiet. Mr Darcy told his friend that she did not truly love him.",
        "A cousin, Mr Collins, came to stay. He was a serious man who worked for the church. One day he asked Elizabeth to marry him. She said no. She wanted to marry for love.",
        "Then Elizabeth met Mr Wickham, a soldier in a red coat. He was charming. He told her a sad story: Mr Darcy had been unkind to him. Elizabeth believed him, and her dislike grew.",
        "One evening, Mr Darcy came to see her. \"I love you,\" he said, \"even though I should not.\" Elizabeth was angry. \"You are proud and unkind,\" she said. \"I will never marry you.\"",
        "The next morning, Mr Darcy gave Elizabeth a long letter. He explained everything. Mr Wickham had lied. And Darcy had separated Jane and Bingley because he thought Jane did not care. He had been wrong.",
        "Months later, Elizabeth visited Pemberley, Mr Darcy's beautiful home. The servants said he was kind and good. Then Darcy himself appeared. He was warm and gentle now. Elizabeth saw a different man.",
        "In the end, Darcy helped the Bennet family, and Elizabeth understood his heart. He asked her again, and this time she said yes. Jane and Bingley also married. Both sisters were happy.",
      ],
      B1B2: [
        "When a wealthy young bachelor rents Netherfield Park, the whole neighbourhood is thrilled. Mrs Bennet, who has five unmarried daughters and little money to leave them, is determined that one of them will win him.",
        "She hurries to tell her husband the news, hoping he will visit the newcomer first. Mr Bennet teases her gently, pretending he has no interest, though he has already decided to call on Mr Bingley.",
        "At the local ball, Mr Bingley proves charming and cheerful. His friend Mr Darcy, however, is richer, taller and colder. He stands apart from the crowd, and the guests quickly decide he is insufferably proud.",
        "When Bingley urges him to dance, Darcy glances at Elizabeth Bennet and declares her merely tolerable, not handsome enough to tempt him. She overhears the remark, and it stays with her long afterwards.",
        "Elizabeth refuses to feel hurt. She laughs about it with her friends, but privately she resolves to dislike him. Whenever they meet afterwards, she answers his silences with quick, teasing, slightly sharp remarks.",
        "Meanwhile Jane and Bingley grow closer with every meeting. Jane, however, is so modest that she hides her happiness, and Darcy, watching carefully, wrongly concludes that she feels little for his friend.",
        "Mr Collins, a pompous clergyman who will inherit the Bennets' house, arrives to find a wife. He proposes to Elizabeth with long speeches. She refuses him firmly, insisting that she will only marry for love.",
        "Elizabeth then meets the charming Mr Wickham, an officer who claims that Darcy cheated him out of an inheritance. She believes every word, because it fits what she already thinks of Darcy.",
        "Unexpectedly, Darcy proposes, confessing that he loves her against his better judgement. Insulted by his arrogance and angry about Jane and Wickham, Elizabeth rejects him, accusing him of cruelty and pride.",
        "The next day, he hands her a letter. It reveals that Wickham is a liar, and that Darcy separated Jane and Bingley only because he misjudged Jane's feelings. Elizabeth reads it, ashamed of her prejudice.",
        "Months later, on a trip, Elizabeth tours Pemberley, Darcy's magnificent estate. His servants praise him warmly, and when he appears, he is polite, humble and eager to please. She hardly recognises him.",
        "When Wickham runs away with Lydia, Darcy quietly rescues the family's reputation. Moved and humbled, Elizabeth finally accepts his second proposal, while Jane and Bingley also marry. Both couples begin their lives together.",
      ],
      C1C2: [
        "It is a truth universally acknowledged that a single man of good fortune must be in want of a wife, or so the matchmaking mothers of Hertfordshire believe, none more fervently than Mrs Bennet.",
        "Netherfield Park has been let at last, and Mrs Bennet, with five daughters and an entailed estate to fret over, bursts upon her husband with the intelligence. He, with studied indifference, affects not to care.",
        "At the assembly, Mr Bingley is all affability, but his friend Mr Darcy, whose ten thousand a year is the talk of the room, stands aloof, and his haughty silence forfeits the goodwill of everyone.",
        "Pressed by Bingley to dance, Darcy surveys Elizabeth Bennet and pronounces her tolerable, though hardly handsome enough to tempt him. Overhearing this slight, she bears it with composure, though not, as it proves, with forgetfulness.",
        "Elizabeth, whose wit is her armour, converts the insult into an anecdote and resolves to detest him with perfect cheerfulness. Henceforth, each encounter becomes a skirmish, conducted in civility and edged with irony.",
        "Jane and Bingley, meanwhile, drift gently towards an understanding. Yet Jane's reserve is so complete that Darcy, ever the cautious observer, mistakes serenity for indifference and persuades himself that his friend's affections are unreciprocated.",
        "The obsequious Mr Collins, heir to Longbourn and devoted worshipper of his patroness, arrives to select a bride. Elizabeth declines his pompous proposal with dignity, preferring poverty to a marriage devoid of esteem.",
        "The affable Mr Wickham, resplendent in regimentals, confides that Darcy deprived him of a living promised by his late father. Elizabeth, flattered by his confidence and predisposed against Darcy, credits the tale without scrutiny.",
        "Then, to her astonishment, Darcy declares that he loves her, in spite of her family's inferiority. So offensive is the avowal that Elizabeth refuses him, charging him with arrogance and cruelty towards Wickham and Jane.",
        "His reply arrives by letter at dawn: Wickham, he reveals, is a seducer and a fortune-hunter, and his own interference in Jane's affairs sprang from misjudgement. Elizabeth, rereading, is forced to acknowledge her own blindness.",
        "Touring Pemberley the following summer, Elizabeth encounters its owner unexpectedly, and finds him transformed: courteous, unassuming, anxious to please. The housekeeper's glowing testimony only deepens her reappraisal of a man she had condemned.",
        "When Lydia's elopement threatens to ruin the family, Darcy quietly averts the disgrace. Humbled by gratitude and wiser for her prejudice, Elizabeth accepts his renewed addresses, and Jane's happiness with Bingley completes both sisters' contentment.",
      ],
    },
  },
];

export const findBook = (slug: string): PreviewBook | null => PREVIEW_BOOKS.find((b) => b.slug === slug) ?? null;

/** The pages of one level of a book, each tied to its scene. */
export function pagesOf(book: PreviewBook, level: LevelId): PreviewPage[] {
  return book.text[level].map((text, i) => ({ n: i + 1, text, scene: i + 1 }));
}

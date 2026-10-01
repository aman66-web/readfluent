/**
 * TEMPORARY, like the rest of lib/preview: the reader's template (the owner's, 1 Oct 2026) as data.
 * Five pages of Pride and Prejudice retold in Spanish at the three levels, each with the English
 * for the same sentences, three matched words, and a small dictionary of word cards. It is
 * compiled into the app, which CLAUDE.md forbids for real content; M1 replaces it with JSON
 * served from storage and the translation pipeline makes the rest.
 */
import type { ArtId } from "@/components/ObjectPhoto";
import type { LevelId } from "@/lib/content/limits";

export interface WordEntry { ph: string; pos: string; mean: string; root: string }
/** A word of the text and the word it matches in the translation: shown in the same colour in both. */
export interface KeyPair { w: string; en: string }
export interface TargetText { text: string; translation: string; keys: KeyPair[] }
export interface TargetPage { art: ArtId; bg: string; text: Record<LevelId, TargetText> }

export const SPANISH_LANG = "es" as const;

export const SPANISH_DICT: Record<string, WordEntry> = {
  "baile": { ph: "BYE-leh", pos: "noun · m.", mean: "dance; a party where people dance", root: "bailar — to dance" },
  "amable": { ph: "ah-MAH-bleh", pos: "adjective", mean: "friendly, kind", root: "" },
  "orgulloso": { ph: "or-goo-YOH-soh", pos: "adjective", mean: "proud", root: "orgullo — pride" },
  "oyó": { ph: "oh-YOH", pos: "verb · past", mean: "heard", root: "oír — to hear" },
  "guapa": { ph: "GWAH-pah", pos: "adjective · f.", mean: "pretty, good-looking", root: "guapo (masculine)" },
  "bastante": { ph: "bahs-TAHN-teh", pos: "adverb", mean: "enough; quite", root: "" },
  "hermosa": { ph: "er-MOH-sah", pos: "adjective · f.", mean: "beautiful", root: "hermoso (masculine)" },
  "olvidó": { ph: "ol-bee-DOH", pos: "verb · past", mean: "forgot", root: "olvidar — to forget" },
  "tolerable": { ph: "toh-leh-RAH-bleh", pos: "adjective", mean: "bearable; just good enough", root: "" },
  "resentimiento": { ph: "reh-sen-tee-MYEN-toh", pos: "noun · m.", mean: "resentment; a bitter feeling", root: "resentir — to resent" },
  "gustaba": { ph: "goos-TAH-bah", pos: "verb · imperfect", mean: "was pleasing to; liked", root: "gustar — to like" },
  "hermanas": { ph: "er-MAH-nahs", pos: "noun · f. pl.", mean: "sisters", root: "hermana — sister" },
  "pensaban": { ph: "pen-SAH-bahn", pos: "verb · imperfect", mean: "thought", root: "pensar — to think" },
  "frecuentemente": { ph: "freh-kwen-teh-MEN-teh", pos: "adverb", mean: "often, frequently", root: "frecuente — frequent" },
  "admiración": { ph: "ahd-mee-rah-THYOHN", pos: "noun · f.", mean: "admiration", root: "admirar — to admire" },
  "desdén": { ph: "des-DEN", pos: "noun · m.", mean: "disdain; scorn", root: "" },
  "tramaron": { ph: "trah-MAH-rohn", pos: "verb · past", mean: "plotted; schemed", root: "tramar — to plot" },
  "llovió": { ph: "yoh-BYOH", pos: "verb · past", mean: "rained", root: "llover — to rain" },
  "enferma": { ph: "en-FEHR-mah", pos: "adjective · f.", mean: "ill, sick", root: "enfermo (masculine)" },
  "quedarse": { ph: "keh-DAR-seh", pos: "verb · infinitive", mean: "to stay", root: "quedar — to remain" },
  "caballo": { ph: "kah-BAH-yoh", pos: "noun · m.", mean: "horse", root: "" },
  "anticipando": { ph: "ahn-tee-thee-PAHN-doh", pos: "verb · gerund", mean: "expecting; anticipating", root: "anticipar — to anticipate" },
  "febril": { ph: "feh-BREEL", pos: "adjective", mean: "feverish", root: "fiebre — fever" },
  "obligada": { ph: "oh-blee-GAH-dah", pos: "adjective · f.", mean: "obliged; forced", root: "obligar — to oblige" },
  "preocupada": { ph: "preh-oh-koo-PAH-dah", pos: "adjective · f.", mean: "worried", root: "preocupar — to worry" },
  "caminó": { ph: "kah-mee-NOH", pos: "verb · past", mean: "walked", root: "caminar — to walk" },
  "millas": { ph: "MEE-yahs", pos: "noun · f. pl.", mean: "miles", root: "milla — mile" },
  "sucio": { ph: "SOO-thyoh", pos: "adjective", mean: "dirty", root: "" },
  "brillantes": { ph: "bree-YAHN-tes", pos: "adjective · pl.", mean: "bright, shining", root: "brillar — to shine" },
  "alarmada": { ph: "ah-lar-MAH-dah", pos: "adjective · f.", mean: "alarmed", root: "alarmar — to alarm" },
  "burló": { ph: "boor-LOH", pos: "verb · past", mean: "mocked (se burló de = sneered at)", root: "burlarse — to mock" },
  "vigor": { ph: "bee-GOR", pos: "noun · m.", mean: "energy, strength", root: "" },
};

export const SPANISH_PAGES: TargetPage[] = [
  {
    art: "candle", bg: "#2f7f93",
    text: {
      A1A2: {
        text: "En el baile, el señor Bingley era amable, pero el señor Darcy era orgulloso.",
        translation: "At the dance, Mr Bingley was friendly, but Mr Darcy was proud.",
        keys: [{ w: "baile", en: "dance" }, { w: "amable", en: "friendly" }, { w: "orgulloso", en: "proud" }],
      },
      B1B2: {
        text: "En el baile de Meryton, el señor Bingley fue amable y bailó con Jane. El señor Darcy era rico y apuesto, pero era demasiado orgulloso para hablar con nadie.",
        translation: "At the dance in Meryton, Mr Bingley was friendly and danced with Jane. Mr Darcy was rich and handsome, but he was too proud to talk to anyone.",
        keys: [{ w: "baile", en: "dance" }, { w: "amable", en: "friendly" }, { w: "orgulloso", en: "proud" }],
      },
      C1C2: {
        text: "En el baile de Meryton, Bingley fue amable y encantador, y bailó toda la noche. Darcy, más rico y más apuesto, permaneció aparte en un frío silencio. En pocos minutos, su carácter orgulloso había hecho que toda la sala lo detestara.",
        translation: "At the dance in Meryton, Bingley was friendly and charming, and he danced all evening. Darcy was richer and handsomer, yet he stood apart in cold silence. Within minutes, his proud manner had made the whole room dislike him.",
        keys: [{ w: "baile", en: "dance" }, { w: "amable", en: "friendly" }, { w: "orgulloso", en: "proud" }],
      },
    },
  },
  {
    art: "fan", bg: "#e8b5c2",
    text: {
      A1A2: {
        text: "Elizabeth oyó a Darcy decir: \"Ella no es bastante guapa para mí.\"",
        translation: "Elizabeth heard Mr Darcy say, \"She is not beautiful enough for me.\"",
        keys: [{ w: "oyó", en: "heard" }, { w: "guapa", en: "beautiful" }, { w: "bastante", en: "enough" }],
      },
      B1B2: {
        text: "El señor Darcy dijo que Elizabeth no era bastante hermosa para él. Ella oyó cada palabra, y se rio, pero no lo olvidó.",
        translation: "Mr Darcy said that Elizabeth was not beautiful enough for him. She heard every word, and she laughed, but she did not forget.",
        keys: [{ w: "hermosa", en: "beautiful" }, { w: "oyó", en: "heard" }, { w: "olvidó", en: "forget" }],
      },
      C1C2: {
        text: "Bingley le pidió a Darcy que bailara con Elizabeth, pero este la despreció: apenas tolerable, dijo, y no lo bastante hermosa para tentarlo. Elizabeth oyó cada sílaba y soportó la ofensa con buen humor. Sin embargo, dentro de ella había nacido una semilla de resentimiento, y no lo olvidó.",
        translation: "Urged by Bingley to dance with Elizabeth, Darcy dismissed her as barely tolerable and not handsome enough to tempt him. Elizabeth overheard every syllable and bore the insult with good humour. Yet within her a seed of resentment had been planted, and she did not forget.",
        keys: [{ w: "tolerable", en: "tolerable" }, { w: "resentimiento", en: "resentment" }, { w: "olvidó", en: "forget" }],
      },
    },
  },
  {
    art: "letter", bg: "#efd47f",
    text: {
      A1A2: {
        text: "A todos les gustaba el señor Bingley, pero sus hermanas pensaban que los Bennet no eran bastante buenos.",
        translation: "Everyone liked Mr Bingley, but his sisters thought the Bennets were not good enough.",
        keys: [{ w: "gustaba", en: "liked" }, { w: "hermanas", en: "sisters" }, { w: "pensaban", en: "thought" }],
      },
      B1B2: {
        text: "A todos en el pueblo les gustaba el señor Bingley, y él visitaba frecuentemente a Jane. Pero sus hermanas pensaban que los Bennet no eran dignos de su hermano.",
        translation: "Everyone in town liked Mr Bingley, and he often visited Jane. But his sisters thought the Bennets were not good enough for their brother.",
        keys: [{ w: "gustaba", en: "liked" }, { w: "frecuentemente", en: "often" }, { w: "hermanas", en: "sisters" }],
      },
      C1C2: {
        text: "La admiración de Bingley por Jane crecía con cada encuentro, y el sereno carácter de ella la correspondía de buen grado. Sus hermanas, en cambio, miraban a los Bennet con velado desdén. Tramaron empujarlo hacia una alianza más ilustre.",
        translation: "Bingley's admiration for Jane grew with every meeting, and her serene temper gladly met it. His sisters, however, regarded the Bennets' connections with veiled disdain. They schemed to steer him toward a grander alliance.",
        keys: [{ w: "admiración", en: "admiration" }, { w: "desdén", en: "disdain" }, { w: "tramaron", en: "schemed" }],
      },
    },
  },
  {
    art: "umbrella", bg: "#5b6fa8",
    text: {
      A1A2: {
        text: "Llovió, y Jane se puso muy enferma y tuvo que quedarse en Netherfield.",
        translation: "It rained, and Jane got very ill and had to stay at Netherfield.",
        keys: [{ w: "llovió", en: "rained" }, { w: "enferma", en: "ill" }, { w: "quedarse", en: "stay" }],
      },
      B1B2: {
        text: "La señora Bennet envió a Jane a Netherfield a caballo, esperando lluvia. Llovió mucho, y Jane se puso enferma y tuvo que quedarse allí.",
        translation: "Mrs Bennet sent Jane to Netherfield on a horse, hoping for rain. It rained hard, and Jane became ill and had to stay there.",
        keys: [{ w: "caballo", en: "horse" }, { w: "llovió", en: "rained" }, { w: "enferma", en: "ill" }],
      },
      C1C2: {
        text: "La señora Bennet envió a Jane a Netherfield a caballo, anticipando la lluvia. El aguacero cumplió su deseo, y Jane llegó febril. Se vio obligada, para secreta satisfacción de su madre, a quedarse como huésped enferma.",
        translation: "Mrs Bennet sent Jane to Netherfield on horseback, anticipating rain. The downpour obliged her, and Jane arrived feverish. She was compelled, much to her mother's secret satisfaction, to remain as an invalid guest.",
        keys: [{ w: "anticipando", en: "anticipating" }, { w: "febril", en: "feverish" }, { w: "obligada", en: "compelled" }],
      },
    },
  },
  {
    art: "boot", bg: "#8cc2a0",
    text: {
      A1A2: {
        text: "Elizabeth estaba preocupada, así que caminó tres millas para ver a Jane.",
        translation: "Elizabeth was worried, so she walked three miles to see Jane.",
        keys: [{ w: "preocupada", en: "worried" }, { w: "caminó", en: "walked" }, { w: "millas", en: "miles" }],
      },
      B1B2: {
        text: "Elizabeth estaba preocupada por su hermana, así que caminó tres millas por campos mojados. Su vestido estaba sucio, pero el señor Darcy notó sus ojos brillantes.",
        translation: "Elizabeth was worried about her sister, so she walked three miles across wet fields. Her dress was dirty, but Mr Darcy noticed her bright eyes.",
        keys: [{ w: "preocupada", en: "worried" }, { w: "sucio", en: "dirty" }, { w: "brillantes", en: "bright" }],
      },
      C1C2: {
        text: "Alarmada por su hermana, Elizabeth caminó tres millas entre el barro hasta Netherfield. La señorita Bingley se burló de su desaliño. Darcy, sin embargo, se sintió sorprendido por el vigor que el ejercicio había dado a sus ojos.",
        translation: "Alarmed for her sister, Elizabeth tramped three miles through mud to Netherfield. Miss Bingley sneered at her dishevelment. Darcy, however, found himself struck by the vigour that exercise had lent her eyes.",
        keys: [{ w: "alarmada", en: "alarmed" }, { w: "burló", en: "sneered" }, { w: "vigor", en: "vigour" }],
      },
    },
  },
];

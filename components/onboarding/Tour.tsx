"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ScenePhoto } from "@/components/ScenePhoto";
import { C, CoverFace } from "@/components/welcome/covers";
import { LEVELS, type LevelId } from "@/lib/content/limits";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import type { MessageId } from "@/lib/i18n/en";
import { PREVIEW_BOOKS, pagesOf } from "@/lib/preview/catalog";
import type { ShowId } from "@/lib/onboarding/steps";
import { GuideFrame, GuideHead, useGuide } from "./Guide";
import type { Mood } from "@/components/mascot/Mascot";

/**
 * The guide's tour: three screens, each one line from the guide and one picture of
 * what it means. They claim only what this app does:
 *
 *   journey    books of their choice, a few pages at a time, with a few questions
 *              in the language after every few pages (the phone is the reader)
 *   levels     every book at your level and your length
 *   connect    the books everyone talks about
 */
/** How Dewey looks on each tour screen: reading for the books, eager for the rest, cheering at the last. */
const TOUR_MOOD: Record<ShowId, Mood> = { journey: "reading", levels: "ready", connect: "cheer" };

export function TourScreen({ id, at, of, learn, onBack, onContinue }: {
  id: ShowId; at: number; of: number; learn: LanguageCode | null; onBack: () => void; onContinue: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const language = languageName(learn ?? "en", locale);
  const line = t(LINES[id], { language });
  const guide = useGuide(line);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead guide={guide} line={line} mood={TOUR_MOOD[id]} sub={id === "journey" ? t("tour.booksSub", { language }) : undefined} />
        <div className="mt-6 flex min-h-0 flex-1 flex-col items-center justify-center" aria-hidden>
          {id === "journey" && <Journey />}
          {id === "levels" && <Levels />}
          {id === "connect" && <Connect />}
        </div>
      </div>
    </GuideFrame>
  );
}

const LINES: Record<ShowId, MessageId> = {
  journey: "tour.booksLine",
  levels: "tour.levels",
  connect: "tour.connect",
};

/** When each thing arrives, after the guide has started its line. */
const later = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

/* ── journey: a phone reading, and asking ──────────────────────────────────
   The phone is the reader itself, playing a few pages of the sample book — the same
   photograph, the same short text, the progress bar filling, and a touch on the right
   where a tap turns the page — and, every few pages, a quick question about what was
   just read, the way the app will ask them. (The questions are shown here as a picture
   of what is coming; they arrive with the word cards and flashcards, M5 and M7.) */
type Frame = { kind: "page"; page: number } | { kind: "quiz" };
const REEL: readonly Frame[] = [
  { kind: "page", page: 1 }, { kind: "page", page: 2 }, { kind: "page", page: 3 }, { kind: "quiz" },
  { kind: "page", page: 4 }, { kind: "page", page: 5 }, { kind: "page", page: 6 }, { kind: "quiz" },
];
const PAGE_MS = 3400;
const QUIZ_LEVEL: LevelId = "B1B2";

/** The sample question: a word from the page, three meanings, one right. Test content, so it stays in English like the book. */
const QUIZ = { ask: "What does “tolerable” mean?", options: ["Good enough", "Very loud", "Brand new"], right: 0 } as const;

function Journey() {
  const t = useT();
  const [tick, setTick] = useState(0);
  const book = PREVIEW_BOOKS[0];
  // A page at a time, round and round.
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), PAGE_MS);
    return () => window.clearInterval(id);
  }, []);
  const frame = REEL[tick % REEL.length];
  const pages = pagesOf(book, QUIZ_LEVEL);
  const page = frame.kind === "page" ? pages[frame.page - 1] : null;
  // How far through the book the bar is: the last page shown, also while a question is up.
  const shown = REEL.slice(0, (tick % REEL.length) + 1).reverse().find((f): f is Extract<Frame, { kind: "page" }> => f.kind === "page")?.page ?? 1;
  const levelLabel = LEVELS.find((l) => l.id === QUIZ_LEVEL)?.label;
  return (
    /* Sized by the height it is given, so a short phone gets a shorter phone rather
       than one that runs up over the guide's line. */
    <div dir="ltr" className="show-phone wel-in relative aspect-[9/17.4] h-full max-h-[400px] rounded-[36px] p-2" style={later(700)}>
      <div className="relative size-full overflow-hidden rounded-[29px] bg-white">
        <span className="absolute left-1/2 top-2 z-[2] h-[13px] w-[58px] -translate-x-1/2 rounded-full bg-black" />
        {/* The reader's own header: the book, the level, and how far through it. */}
        <div className="absolute inset-x-3 top-[26px] z-[1]">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[7.5px] font-bold uppercase tracking-[0.12em] text-[#0B1B22]/60">{book.title}</p>
            <span className="shrink-0 rounded-full bg-[#0891B2]/12 px-1.5 py-[1px] text-[7px] font-bold text-[#0E7490]">{levelLabel}</span>
          </div>
          <span className="mt-1 block h-[2px] overflow-hidden rounded-full bg-[#0B1B22]/10">
            <span className="block h-full rounded-full bg-[linear-gradient(90deg,#67E8F9,#22D3EE,#0E7490)] transition-[width] duration-700" style={{ width: `${(shown / pages.length) * 100}%` }} />
          </span>
        </div>
        {page ? (
          /* The photograph, and under it the page, set as the reader sets it. */
          <div key={`page-${tick}`} className="show-swap absolute inset-x-0 top-[44px] bottom-0">
            <ScenePhoto caption={book.scenes[page.scene - 1]?.caption ?? ""} pill={false} className="aspect-[16/11] w-full" />
            <p className="show-line px-3 pt-3 font-reading text-[9.6px] leading-[1.45] text-[#0B1B22]">{page.text}</p>
          </div>
        ) : (
          /* A quick question about what was just read. */
          <div key={`quiz-${tick}`} className="show-swap absolute inset-x-3 top-[52px] bottom-0 pt-3">
            <span className="inline-block rounded-full bg-[#22D3EE]/25 px-2 py-[2px] text-[7px] font-bold uppercase tracking-[0.1em] text-[#0E7490]">{t("tour.quiz")}</span>
            <p className="mt-2 font-reading text-[11px] font-bold leading-[1.25] text-[#0B1B22]">{QUIZ.ask}</p>
            <div className="mt-2.5 space-y-1.5">
              {QUIZ.options.map((o, i) => (
                <p key={o} className={`rounded-[8px] bg-[#F3F8FA] px-2.5 py-[7px] text-[9px] font-semibold text-[#0B1B22] ${i === QUIZ.right ? "quiz-pick" : ""}`}>{o}</p>
              ))}
            </div>
          </div>
        )}
        {page && <p className="absolute inset-x-0 bottom-3 z-[1] text-center text-[7.5px] font-semibold text-[#0B1B22]/45">{t("tour.page", { n: shown, total: pages.length })}</p>}
      </div>
      {/* Where a tap turns the page. */}
      {page && <span className="show-tap absolute right-[9%] top-[44%] size-8 rounded-full" />}
    </div>
  );
}

/* ── levels: two cards, each a claim and a picture of it ─────────────────── */
function Levels() {
  const t = useT();
  return (
    <div className="w-full space-y-3">
      <div className="guide-card wel-in relative flex h-[124px] overflow-hidden rounded-[22px]" style={later(800)}>
        <p className="flex flex-1 items-center px-5 text-[19px] font-semibold leading-[1.15] tracking-[-0.01em]">{t("tour.levelsCard")}</p>
        <span className="relative w-[48%] shrink-0 bg-[linear-gradient(160deg,#0E7490,#082F3E)]">
          {/* Three steps up, one for each band of level. */}
          <svg viewBox="0 0 160 124" className="size-full" fontFamily="var(--font-jakarta), sans-serif" fontWeight="800" fontSize="15" textAnchor="middle">
            <g className="show-fan">
              <rect x="22" y="62" width="34" height="44" rx="8" fill="#7C6FD8" />
              <rect x="63" y="42" width="34" height="64" rx="8" fill="#22D3EE" />
              <rect x="104" y="20" width="34" height="86" rx="8" fill="#E6FBFF" />
              <text x="39" y="92" fill="#fff">A</text><text x="80" y="92" fill="#04222B">B</text><text x="121" y="92" fill="#0E7490">C</text>
            </g>
          </svg>
        </span>
      </div>
      <div className="guide-card wel-in relative flex h-[124px] overflow-hidden rounded-[22px]" style={later(950)}>
        <p className="flex flex-1 items-center px-5 text-[19px] font-semibold leading-[1.15] tracking-[-0.01em]">{t("tour.lengthsCard")}</p>
        <span className="relative w-[48%] shrink-0 bg-[linear-gradient(160deg,#1B2250,#0D1030)]">
          {/* Three stacks of pages, short, medium and long. */}
          <svg viewBox="0 0 160 124" className="size-full" fontFamily="var(--font-jakarta), sans-serif" fontWeight="800" fontSize="13" textAnchor="middle">
            <g className="show-fan">
              {[[26, 36, "50"], [64, 56, "100"], [102, 76, "200"]].map(([x, h, n]) => (
                <g key={n as string}>
                  <rect x={x as number} y={106 - (h as number)} width="32" height={h as number} rx="6" fill="#F1FAFC" />
                  <rect x={(x as number) + 5} y={106 - (h as number) + 6} width="22" height="3" rx="1.5" fill="#0E7490" opacity=".5" />
                  <text x={(x as number) + 16} y="94" fill="#0E7490">{n as string}</text>
                </g>
              ))}
            </g>
          </svg>
        </span>
      </div>
    </div>
  );
}

/* ── connect: real books, to read while you learn ────────────────────────
   Five of the covers from the first screen, fanned like a hand of cards, floating a little,
   with a few greetings in other languages around them. */
const FAN: { cover: keyof typeof C; left: number; top: number; rot: number; w: number; z: number }[] = [
  { cover: "frank", left: 5, top: 46, rot: -13, w: 92, z: 1 },
  { cover: "treasure", left: 19, top: 20, rot: -7, w: 104, z: 2 },
  { cover: "pride", left: 36, top: 0, rot: 0, w: 124, z: 5 },
  { cover: "alice", left: 57, top: 20, rot: 7, w: 104, z: 3 },
  { cover: "dracula", left: 71, top: 46, rot: 13, w: 92, z: 2 },
];
const HELLOS = ["Hello", "Hola", "Bonjour", "你好", "Ciao"] as const;

function Connect() {
  return (
    <div dir="ltr" className="flex w-full max-w-[340px] flex-col items-center gap-5">
      <div className="relative h-[250px] w-full">
        <div className="absolute inset-x-6 top-10 h-40 rounded-full bg-accent-bright/25 blur-3xl" />
        {FAN.map(({ cover, left, top, rot, w, z }, i) => (
          <div key={cover} className="wel-pop absolute" style={{ left: `${left}%`, top, zIndex: z, ["--d" as string]: `${500 + i * 130}ms` } as CSSProperties}>
            <div className="show-bob" style={{ width: w, ["--r" as string]: `${rot}deg`, ["--b" as string]: `${i * 0.35}s`, transform: `rotate(${rot}deg)` } as CSSProperties}>
              <CoverFace cover={C[cover]} className="drop-shadow-[0_16px_18px_rgba(8,47,60,.38)]" />
            </div>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {HELLOS.map((h, i) => (
          <li key={h} className="wel-fade guide-card relative inline-flex h-9 items-center rounded-full px-3.5 text-[14px] font-semibold" style={{ ["--d" as string]: `${1200 + i * 110}ms` } as CSSProperties}>{h}</li>
        ))}
      </ul>
    </div>
  );
}

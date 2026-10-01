import { Lex, type Mood } from "@/components/mascot/Lex";

export const metadata = { title: "Meet Lex · ReadFluent" };

const POSES: readonly { mood: Mood; label: string; note: string }[] = [
  { mood: "hello", label: "Hello", note: "Waves hello. The welcome, and the guide's lines." },
  { mood: "reading", label: "Reading", note: "Eyes on the page, a letter floating off it." },
  { mood: "cheer", label: "Cheering", note: "A level up, a finished book, a streak kept." },
  { mood: "sleepy", label: "Sleepy", note: "Dozing off when you have been away a while." },
];

/** A page for looking at the mascot: every pose, and the small head that sits beside the guide's lines. */
export default function MascotPage() {
  return (
    <main className="mx-auto max-w-[440px] px-5 pb-16 pt-8">
      <h1 className="text-[30px] font-bold tracking-[-0.02em]">Meet Lex</h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">A bookworm in round glasses who lives in an open book. A bookworm is someone who loves to read, and Lex is your guide.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {POSES.map((p) => (
          <figure key={p.mood} className="rounded-[22px] border border-border bg-surface p-3">
            <Lex mood={p.mood} className="mx-auto block w-full" />
            <figcaption className="mt-1 px-1 pb-1">
              <p className="text-[14px] font-semibold">{p.label}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">{p.note}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-4">
        <Lex mood="hello" talking crop="head" className="w-[72px] shrink-0" />
        <p className="text-[13.5px] leading-snug text-muted">The small head, with its mouth moving, sits beside the guide&apos;s lines during the first run.</p>
      </div>
    </main>
  );
}

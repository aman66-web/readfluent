"use client";

import { useState } from "react";
import { LevelUp } from "@/components/xp/LevelUp";
import type { LevelUp as LevelUpInfo } from "@/lib/xp/levels";
import { MASCOT_NAME } from "@/lib/brand";

const SAMPLES: { label: string; up: LevelUpInfo }[] = [
  { label: "A new stage: B1.2", up: { code: "B1.2", level: "B1", newLevel: false } },
  { label: "A new level: B2", up: { code: "B2.1", level: "B2", newLevel: true } },
  { label: "The top: C2", up: { code: "C2", level: "C2", newLevel: true } },
];

/** A page for looking at the level-up celebration, the way a reader sees it when they reach a new stage or level (not in the menu). */
export default function CelebratePage() {
  const [up, setUp] = useState<LevelUpInfo | null>(null);
  return (
    <main className="mx-auto max-w-[440px] px-5 pb-16 pt-8">
      <h1 className="text-[30px] font-bold tracking-[-0.02em]">The level-up</h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">What {MASCOT_NAME} does when a reader reaches a new stage of their level, or a whole new level.</p>
      <div className="mt-6 flex flex-col gap-3">
        {SAMPLES.map((s) => (
          <button key={s.label} type="button" onClick={() => setUp(s.up)} className="h-14 btn-cyan rounded-full text-[16px] font-bold">{s.label}</button>
        ))}
      </div>
      {up && <LevelUp up={up} onClose={() => setUp(null)} />}
    </main>
  );
}

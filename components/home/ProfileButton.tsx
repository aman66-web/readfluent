"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";

/**
 * The profile button, top right of Home: a round button with the reader's initial when they
 * have given a name and a head and shoulders when they have not, ringed in the brand's cyan.
 * It opens Profile (settings, account, delete).
 */
export function ProfileButton() {
  const t = useT();
  const { name } = useAnswers();
  const initial = name.trim().charAt(0).toLocaleUpperCase();
  return (
    <Link href="/me" aria-label={t("me.open")}
          className="grid size-11 shrink-0 place-items-center rounded-full p-[2px] active:scale-[0.96]"
          style={{ background: "conic-gradient(from 200deg, #67E8F9, #22D3EE, #0E7490, #67E8F9)" }}>
      <span className="grid size-full place-items-center rounded-full bg-white text-[16px] font-bold text-foreground">
        {initial || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-accent" aria-hidden>
            <path d="M12 11.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM4.5 20a7.5 7.5 0 0115 0" />
          </svg>
        )}
      </span>
    </Link>
  );
}

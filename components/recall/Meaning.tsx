"use client";

import { useAnswers } from "@/lib/onboarding/use-answers";
import { useMeaning } from "./useMeaning";

/** An English meaning, in the reader's own language where the phone's translator can (see useMeaning). */
export function Meaning({ text }: { text: string }) {
  const a = useAnswers();
  const shown = useMeaning(text, a.language);
  return <bdi lang={shown === text ? "en" : a.language}>{shown}</bdi>;
}

"use client";

import { useEffect } from "react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { startBackground, stopBackground } from "@/lib/translate/background";

/** Starts translating the library on the phone once a language to learn is chosen (lib/translate/background.ts). Renders nothing. */
export function BackgroundTranslation() {
  const a = useAnswers();
  const liked = a.interests.join(",");
  useEffect(() => {
    if (!a.learn || a.learn === "en") { stopBackground(); return; }
    // Left a moment to the screen in front of the reader first: the first page of the app should not compete with this.
    const id = setTimeout(() => startBackground(a.learn as string, a.level, liked ? liked.split(",") : []), 4000);
    return () => clearTimeout(id);
  }, [a.learn, a.level, liked]);
  return null;
}

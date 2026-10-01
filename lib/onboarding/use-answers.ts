"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { ANSWERS_KEY, parseAnswers, type Answers } from "./answers";

const subscribe = subscribeTo(ANSWERS_KEY);
const read = () => readRaw(ANSWERS_KEY);
// The server has no device storage: "" is what the first client render shows too.
const server = () => "";

/** What the reader said on the first run, from the device; it follows changes made anywhere in the app. */
export function useAnswers(): Answers {
  const raw = useSyncExternalStore(subscribe, read, server);
  return useMemo(() => parseAnswers(raw), [raw]);
}

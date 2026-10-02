import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import { TOUR } from "./steps";

/** Where the reader is in the guided tour (lib/tour/steps.ts), kept on the device. */
export const TOUR_KEY = storageKey("tour");

export interface TourState {
  /** The step up to; the tour is finished when `done`. */
  step: number;
  done: boolean;
}
/** Nothing remembered: the tour has not begun. */
export const FRESH: TourState = { step: 0, done: false };

export function parseTour(raw: string | null | undefined): TourState {
  if (!raw) return FRESH;
  try {
    const v = JSON.parse(raw) as Partial<TourState> | null;
    const step = typeof v?.step === "number" && Number.isInteger(v.step) && v.step >= 0 ? Math.min(v.step, TOUR.length - 1) : 0;
    return { step, done: v?.done === true };
  } catch {
    return FRESH;
  }
}

const save = (s: TourState): void => { writeRaw(TOUR_KEY, JSON.stringify(s)); };
export const setTourStep = (step: number): void => save({ step, done: false });
export const finishTour = (): void => save({ step: 0, done: true });
/** Start the tour again from the beginning. */
export const restartTour = (): void => save(FRESH);
export const readTour = (): TourState => parseTour(readRaw(TOUR_KEY));

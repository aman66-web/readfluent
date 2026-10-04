import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import { parseSocial, readSocialRaw } from "./cache";

const SEED_KEY = storageKey("board-seed");

/** A seed of this device's own, so practice readers differ from one reader to the next: the friend code once there is one. */
export function boardSeed(code = parseSocial(readSocialRaw()).friendCode): string {
  if (code) return code;
  let s = readRaw(SEED_KEY);
  if (!s) { s = Math.random().toString(36).slice(2, 10); writeRaw(SEED_KEY, s); }
  return s;
}

import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";

/** What the device remembers of the social side, so the home screen can say things without asking the server. */
export const SOCIAL_KEY = storageKey("social");

export interface SocialCache { friends: number; friendCode: string }
export const NO_SOCIAL: SocialCache = { friends: 0, friendCode: "" };

export function parseSocial(raw: string | null | undefined): SocialCache {
  if (!raw) return NO_SOCIAL;
  try {
    const v = JSON.parse(raw) as Partial<SocialCache> | null;
    return {
      friends: typeof v?.friends === "number" && Number.isInteger(v.friends) && v.friends >= 0 ? v.friends : 0,
      friendCode: typeof v?.friendCode === "string" && /^[A-Z0-9]{8}$/.test(v.friendCode) ? v.friendCode : "",
    };
  } catch {
    return NO_SOCIAL;
  }
}

export const readSocialRaw = (): string => readRaw(SOCIAL_KEY);
export function saveSocial(patch: Partial<SocialCache>): void {
  writeRaw(SOCIAL_KEY, JSON.stringify({ ...parseSocial(readRaw(SOCIAL_KEY)), ...patch }));
}

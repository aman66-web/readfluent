import { createClient } from "@/lib/db/client";
import { parseFriends, parseLeague, type FriendRow, type League } from "./model";

/** What the friends screens ask of the server. Browser only: each call runs as the signed-in reader (the functions refuse anyone else). */
export class NeedsSignIn extends Error {}

type Rpc = { data: unknown; error: { code?: string; message: string } | null };

async function rpc(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = (await createClient().rpc(name, args)) as Rpc;
  if (error) {
    if (error.code === "28000" || /sign_in_required/.test(error.message)) throw new NeedsSignIn();
    throw new Error(error.message);
  }
  return data;
}

export type AddResult = "sent" | "accepted" | "already_friends" | "already_sent" | "not_found" | "self" | "no_profile" | "too_many";
const ADD_RESULTS: readonly string[] = ["sent", "accepted", "already_friends", "already_sent", "not_found", "self", "no_profile", "too_many"];

/** Reports the reader to the server and returns their friend code. */
export async function syncProfile(p: { p_name: string; p_level: string; p_xp: number; p_streak: number; p_days: { day: string; xp: number }[] }): Promise<string> {
  const code = await rpc("sync_profile", p);
  if (typeof code !== "string") throw new Error("no friend code");
  return code;
}
export async function addFriend(code: string): Promise<AddResult> {
  const r = await rpc("add_friend", { p_code: code });
  return typeof r === "string" && ADD_RESULTS.includes(r) ? (r as AddResult) : "not_found";
}
export async function respondFriend(id: string, accept: boolean): Promise<void> { await rpc("respond_friend", { p_id: id, p_accept: accept }); }
export async function removeFriend(id: string): Promise<void> { await rpc("remove_friend", { p_friendship: id }); }
export async function myFriends(): Promise<FriendRow[]> { return parseFriends(await rpc("my_friends")); }
export async function myLeague(): Promise<League | null> { return parseLeague(await rpc("my_league")); }

import { dbConfigured } from "@/lib/db/env";

/** Whether Talk can run on this server: a model key and a database. A yes/no only; the key itself never leaves the server. */
export const talkReady = (): boolean => !!process.env.ANTHROPIC_API_KEY && dbConfigured();

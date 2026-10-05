import { PaywallPage } from "@/components/paywall/PaywallPage";

export const metadata = { title: "Premium · ReadFluent" };

/**
 * The subscription screen on its own address, to look at it and to link to it. `?preview=GBP` (or EUR, USD, JPY)
 * shows it with pretend store prices, in development only: in a production build the parameter is ignored.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.preview) ? sp.preview[0] : sp.preview;
  const preview = process.env.NODE_ENV !== "production" && raw ? raw : undefined;
  return <PaywallPage preview={preview} />;
}

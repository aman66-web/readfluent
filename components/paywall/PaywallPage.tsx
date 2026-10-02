"use client";

import { useRouter } from "next/navigation";
import { Paywall } from "./Paywall";

export function PaywallPage() {
  const router = useRouter();
  return <Paywall onClose={() => (window.history.length > 1 ? router.back() : router.push("/me"))} />;
}

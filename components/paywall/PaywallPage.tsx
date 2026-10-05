"use client";

import { useRouter } from "next/navigation";
import { previousPath } from "@/lib/nav";
import { Paywall } from "./Paywall";

export function PaywallPage({ preview }: { preview?: string }) {
  const router = useRouter();
  return <Paywall preview={preview} onClose={() => (previousPath() !== null ? router.back() : router.push("/me"))} />;
}

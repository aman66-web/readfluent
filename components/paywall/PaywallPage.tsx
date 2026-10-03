"use client";

import { useRouter } from "next/navigation";
import { previousPath } from "@/lib/nav";
import { Paywall } from "./Paywall";

export function PaywallPage() {
  const router = useRouter();
  return <Paywall onClose={() => (previousPath() !== null ? router.back() : router.push("/me"))} />;
}

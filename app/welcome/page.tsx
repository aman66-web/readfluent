"use client";

import "./welcome.css";
import { useRouter } from "next/navigation";
import { FirstScreen } from "@/components/welcome/FirstScreen";
import { display, jakarta } from "@/lib/fonts";
import { markOnboarded } from "@/lib/onboarding";

/**
 * The first screen. "Get started" remembers that it has been seen and opens the
 * library. Always reachable at /welcome, so it can be looked at again.
 */
export default function WelcomePage() {
  const router = useRouter();
  return (
    <div className={`${jakarta.variable} ${display.variable}`}>
      <FirstScreen onStart={() => { markOnboarded(); router.push("/"); }} />
    </div>
  );
}

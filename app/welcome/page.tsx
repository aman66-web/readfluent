import "./welcome.css";
import { cookies } from "next/headers";
import { Welcome } from "@/components/welcome/Welcome";
import { clampStep, isRealAccount } from "@/lib/auth/gate";
import { createClient } from "@/lib/db/server";
import { dbConfigured } from "@/lib/db/env";
import { displayFull as display, jakarta } from "@/lib/fonts-welcome";
import { ONBOARDED_COOKIE } from "@/lib/onboarding";
import { STEP_IDS, stepIndex } from "@/lib/onboarding/steps";

/**
 * First run (the screens and their order are in components/welcome/Welcome.tsx and lib/onboarding/steps.ts).
 * `/welcome?step=<id>` opens any step directly. The step is read here, on the server, so the first
 * screen is in the page's HTML and paints before any script arrives. The steps after the sign-in are only opened
 * for somebody with an account (a link to one lands on the sign-in), decided here so no later screen is ever sent to them.
 */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const accountStep = STEP_IDS.indexOf("account");
  let step = stepIndex(one("step"));
  if (dbConfigured() && step > accountStep) {
    let account = false;
    try { account = isRealAccount((await (await createClient()).auth.getUser()).data.user); } catch { /* cannot be asked: treated as no account */ }
    step = clampStep(step, accountStep, account);
  }
  const onboarded = (await cookies()).has(ONBOARDED_COOKIE);
  return (
    <div className={`${jakarta.variable} ${display.variable} min-h-dvh bg-white`}>
      <Welcome initialStep={step} onboarded={onboarded} authError={one("error") === "auth"} built={one("built") === "1"} signedIn={one("signedin") === "1"} />
    </div>
  );
}

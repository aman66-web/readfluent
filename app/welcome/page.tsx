import "./welcome.css";
import { Welcome } from "@/components/welcome/Welcome";
import { displayFull as display, jakarta } from "@/lib/fonts-welcome";
import { stepIndex } from "@/lib/onboarding/steps";

/**
 * First run (the screens and their order are in components/welcome/Welcome.tsx and lib/onboarding/steps.ts).
 * `/welcome?step=<id>` opens any step directly. The step is read here, on the server, so the first
 * screen is in the page's HTML and paints before any script arrives.
 */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  return (
    <div className={`${jakarta.variable} ${display.variable} min-h-dvh bg-white`}>
      <Welcome initialStep={stepIndex(one("step"))} authError={one("error") === "auth"} built={one("built") === "1"} signedIn={one("signedin") === "1"} />
    </div>
  );
}

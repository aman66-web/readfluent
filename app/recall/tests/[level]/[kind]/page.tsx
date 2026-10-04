import { notFound } from "next/navigation";
import { LevelTestRunner } from "@/components/tests/LevelTestRunner";
import { TestRunner } from "@/components/tests/TestRunner";
import { TESTS_PER_LEVEL } from "@/lib/tests/level/types";
import { isTestKind } from "@/lib/tests/types";
import { isCefr } from "@/lib/xp/levels";

export const metadata = { title: "Test · ReadFluent" };

/** One test: /recall/tests/<A1…C2>/<1…10> is a level test; /recall/tests/<A1…C2>/<mixed|vocab|gap|meaning|order|listen> is a quick practice paper. */
export default async function TestPage({ params }: { params: Promise<{ level: string; kind: string }> }) {
  const { level, kind } = await params;
  if (!isCefr(level)) notFound();
  if (/^\d{1,2}$/.test(kind)) {
    const n = Number(kind);
    if (n < 1 || n > TESTS_PER_LEVEL) notFound();
    return <LevelTestRunner level={level} n={n} />;
  }
  if (!isTestKind(kind)) notFound();
  return <TestRunner level={level} kind={kind} />;
}

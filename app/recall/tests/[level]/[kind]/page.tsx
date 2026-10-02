import { notFound } from "next/navigation";
import { TestRunner } from "@/components/tests/TestRunner";
import { isTestKind } from "@/lib/tests/types";
import { isCefr } from "@/lib/xp/levels";

export const metadata = { title: "Test · ReadFluent" };

/** One test: /recall/tests/<A1…C2>/<mixed|vocab|gap|meaning|order|listen>. */
export default async function TestPage({ params }: { params: Promise<{ level: string; kind: string }> }) {
  const { level, kind } = await params;
  if (!isCefr(level) || !isTestKind(kind)) notFound();
  return <TestRunner level={level} kind={kind} />;
}

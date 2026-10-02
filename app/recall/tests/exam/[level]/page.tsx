import { notFound } from "next/navigation";
import { ExamRunner } from "@/components/tests/ExamRunner";
import { isExamLevel } from "@/lib/xp/exam";

export const metadata = { title: "Level exam · ReadFluent" };

/** One level exam: /recall/tests/exam/<A2…C2>. It opens only for a reader who has the XP for the level (components/tests/ExamRunner.tsx). */
export default async function ExamPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isExamLevel(level)) notFound();
  return <ExamRunner level={level} />;
}

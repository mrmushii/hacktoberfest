import { handle } from "@/lib/api";
import { db } from "@/lib/db";
import { pagesForPrompt, rankPages } from "@/lib/docs/chunk";
import { practiceQuestions } from "@/lib/exam/analysis";

export const maxDuration = 600;

export async function POST(req: Request) {
  return handle(async () => {
    const { courseId, topic } = (await req.json()) as { courseId: string; topic: string };
    const past = await db.examQuestion.findMany({ where: { topic, document: { courseId } }, take: 8 });
    const lecture = await db.courseDocument.findFirst({ where: { courseId, kind: "lecture" } });
    const pages = lecture ? (JSON.parse(lecture.pages) as string[]) : [];
    const pick = rankPages(pages, `${topic} ${past.map((q) => q.text).join(" ")}`);
    const res = await practiceQuestions(topic, past.map((q) => q.text), pick.length ? pagesForPrompt(pages, 8000, pick) : "");
    return { ...res, lecture: lecture && { id: lecture.id, name: lecture.name } };
  });
}

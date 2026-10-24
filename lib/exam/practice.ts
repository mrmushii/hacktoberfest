import { db } from "@/lib/db";
import { pagesForPrompt, rankPages } from "@/lib/docs/chunk";
import { practiceQuestions } from "./analysis";

/** Practice questions for a topic, grounded in its past questions and the most relevant lecture pages. */
export async function practiceFor(courseId: string, topic: string) {
  const past = await db.examQuestion.findMany({ where: { topic, document: { courseId } }, orderBy: { id: "asc" }, take: 8 });
  const lecture = await db.courseDocument.findFirst({ where: { courseId, kind: "lecture" }, orderBy: { name: "asc" } });
  const pages = lecture ? (JSON.parse(lecture.pages) as string[]) : [];
  const pick = rankPages(pages, `${topic} ${past.map((q) => q.text).join(" ")}`);
  const res = await practiceQuestions(topic, past.map((q) => q.text), pick.length ? pagesForPrompt(pages, 8000, pick) : "");
  return { ...res, lecture: lecture && { id: lecture.id, name: lecture.name } };
}

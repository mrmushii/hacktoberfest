import { db } from "@/lib/db";
import { sha256 } from "@/lib/hash";
import { extractQuestions, extractSyllabusTopics, mapToTopics, type Topic } from "@/lib/exam/analysis";
import { uploadPages, type Upload } from "./pdf";

export type DocKind = "syllabus" | "lecture" | "paper";

/** Store a course document and run its analysis. Re-uploading identical bytes reuses the stored result. */
export async function ingestDocument(courseId: string, kind: DocKind, up: Upload) {
  const contentHash = sha256(up.bytes);
  const existing = await db.courseDocument.findFirst({ where: { courseId, contentHash } });
  if (existing) return { document: existing, reused: true };

  const pages = await uploadPages(up);
  if (!pages.some((p) => p.trim())) throw new Error(up.kind === "pdf" ? "This PDF has no selectable text (scanned?). Upload photos of the pages instead." : "No text found in this file.");

  if (kind === "syllabus") {
    const { data } = await extractSyllabusTopics(pages);
    await db.course.update({ where: { id: courseId }, data: { topics: JSON.stringify(data.topics) } });
  }

  let questions: { number: string; text: string; marks: number | null; page: number; topic: string | null; confidence: number | null }[] = [];
  if (kind === "paper") {
    const course = await db.course.findUniqueOrThrow({ where: { id: courseId } });
    const topics = JSON.parse(course.topics) as Topic[];
    const { data } = await extractQuestions(pages);
    const mapped = topics.length ? (await mapToTopics(data.questions, topics)).data.mappings : [];
    const byNum = new Map(mapped.map((m) => [m.number, m]));
    questions = data.questions.map((q) => ({
      ...q,
      page: Math.min(Math.max(q.page, 1), pages.length),
      topic: byNum.get(q.number)?.topic ?? null,
      confidence: byNum.get(q.number)?.confidence ?? null,
    }));
  }

  const document = await db.courseDocument.create({
    data: { courseId, kind, name: up.name, contentHash, pages: JSON.stringify(pages), questions: { create: questions } },
  });
  return { document, reused: false };
}

export async function remapPapers(courseId: string) {
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId } });
  const topics = JSON.parse(course.topics) as Topic[];
  if (!topics.length) return;
  const papers = await db.courseDocument.findMany({ where: { courseId, kind: "paper" }, include: { questions: true } });
  for (const p of papers) {
    const { data } = await mapToTopics(p.questions, topics);
    for (const m of data.mappings) {
      await db.examQuestion.updateMany({ where: { documentId: p.id, number: m.number }, data: { topic: m.topic, confidence: m.confidence } });
    }
  }
}

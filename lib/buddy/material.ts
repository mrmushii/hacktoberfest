import { z } from "zod/v4";
import { db } from "@/lib/db";
import type { Topic } from "@/lib/exam/analysis";

export const Mcq = z.object({ question: z.string(), options: z.array(z.string()).length(4), answer: z.number().int().min(0).max(3), explanation: z.string(), topic: z.string(), page: z.number().int() });
export type Mcq = z.infer<typeof Mcq>;

/** All lecture pages of a course as one list; page numbers in prompts are 1-based into it. */
export async function courseMaterial(courseId: string) {
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId }, include: { documents: { include: { questions: true }, orderBy: { name: "asc" } } } });
  const pages: string[] = [];
  const labels: string[] = [];
  for (const d of course.documents.filter((d) => d.kind === "lecture")) {
    (JSON.parse(d.pages) as string[]).forEach((p, i) => (pages.push(p), labels.push(`${d.name} p.${i + 1}`)));
  }
  return { course, topics: JSON.parse(course.topics) as Topic[], pages, labels, papers: course.documents.filter((d) => d.kind === "paper") };
}

export const topicNames = (topics: Topic[]) => topics.map((t) => t.name).join("; ") || "(no syllabus topics; infer from the material)";

import { z } from "zod/v4";
import { generate } from "@/lib/ai/client";
import { pagesForPrompt } from "@/lib/docs/chunk";

export const Topic = z.object({ name: z.string(), module: z.string() });
export type Topic = z.infer<typeof Topic>;

export async function extractSyllabusTopics(pages: string[]) {
  return generate({
    task: "exam.syllabus@1",
    tier: "fast",
    schema: z.object({ topics: z.array(Topic) }),
    system: "You list the teachable topics in a university course syllabus. Use short topic names (2-5 words) exactly as the syllabus phrases them, with their module/unit name. Do not invent topics.",
    prompt: `Syllabus:\n${pagesForPrompt(pages)}`,
  });
}

const Question = z.object({ number: z.string(), text: z.string(), marks: z.number().nullable(), page: z.number().int() });

export async function extractQuestions(pages: string[]) {
  return generate({
    task: "exam.questions@2",
    tier: "fast",
    schema: z.object({ questions: z.array(Question) }),
    system:
      "You split an exam paper into sub-questions. Every lettered part is its own entry: question 1 with parts (a) and (b) gives two entries numbered \"1a\" and \"1b\". Copy each part's text verbatim. marks = the marks in [brackets] for that part, or null. page = the [page N] it appears on. Skip instructions and headers.",
    prompt: pagesForPrompt(pages),
  });
}

export async function mapToTopics(questions: { number: string; text: string }[], topics: Topic[]) {
  const names = topics.map((t) => t.name);
  return generate({
    task: "exam.map@1",
    tier: "smart",
    schema: z.object({
      mappings: z.array(z.object({ number: z.string(), topic: z.enum(names as [string, ...string[]]).nullable(), confidence: z.number().min(0).max(1) })),
    }),
    system:
      "Assign each exam question to the single best-matching syllabus topic. Use null if none fits. confidence is 0-1; use below 0.6 when unsure.",
    prompt: `Topics:\n${names.map((n) => `- ${n}`).join("\n")}\n\nQuestions:\n${questions.map((q) => `${q.number}: ${q.text}`).join("\n")}`,
  });
}

export type TopicStat = {
  topic: string;
  module: string;
  papers: number;
  totalPapers: number;
  questions: number;
  marks: number;
  lastSeen: string | null;
  byPaper: Record<string, { number: string; text: string; page: number; marks: number | null }[]>;
};

/** Pure counting over saved, reviewed mappings — no model involved. */
export function topicFrequency(
  topics: Topic[],
  papers: { id: string; name: string; questions: { number: string; text: string; page: number; marks: number | null; topic: string | null }[] }[],
): TopicStat[] {
  return topics
    .map((t) => {
      const byPaper: TopicStat["byPaper"] = {};
      for (const p of papers) {
        const qs = p.questions.filter((q) => q.topic === t.name);
        if (qs.length) byPaper[p.id] = qs.map(({ number, text, page, marks }) => ({ number, text, page, marks }));
      }
      const hits = papers.filter((p) => byPaper[p.id]);
      const all = Object.values(byPaper).flat();
      return {
        topic: t.name,
        module: t.module,
        papers: hits.length,
        totalPapers: papers.length,
        questions: all.length,
        marks: all.reduce((s, q) => s + (q.marks ?? 0), 0),
        lastSeen: hits.at(-1)?.name ?? null,
        byPaper,
      };
    })
    .sort((a, b) => b.papers - a.papers || b.marks - a.marks);
}

export async function practiceQuestions(topic: string, pastQuestions: string[], lecture: string) {
  return generate({
    task: "exam.practice@1",
    tier: "smart",
    schema: z.object({ questions: z.array(z.object({ question: z.string(), hint: z.string(), page: z.number().int().nullable() })) }),
    system:
      "Write 4 new exam-style practice questions on the topic, in the style of the past questions. hint = a short pointer to the answer; page = the [page N] of lecture material that covers it, or null.",
    prompt: `Topic: ${topic}\n\nPast questions:\n${pastQuestions.join("\n")}\n\nLecture material:\n${lecture || "(none uploaded)"}`,
  });
}

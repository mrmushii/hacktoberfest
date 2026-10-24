import { z } from "zod/v4";
import { generate } from "@/lib/ai/client";
import { run } from "./bst";
import { extractOps } from "./parse";
import type { Op, TreeState } from "./types";

export type Step = TreeState & { say: string };
export type QuizItem = { question: string; options: string[]; answer: number; explanation: string };
export type Lesson = { title: string; ops: Op[]; steps: Step[]; quiz: QuizItem[] };

const schema = z.object({
  title: z.string(),
  narration: z.array(z.string()),
  quiz: z.array(z.object({ question: z.string(), options: z.array(z.string()).length(4), answer: z.number().int().min(0).max(3), explanation: z.string() })).max(3),
});

/** The engine decides every fact; the model only puts words to the numbered events. */
export async function buildLesson(text: string) {
  const ops = await extractOps(text);
  const states = run(ops);
  const r = await generate({
    task: "tutor.lesson@2",
    tier: "smart",
    schema,
    system: `You are a friendly teacher explaining a binary search tree on a whiteboard to a university student.
Write exactly one narration line per numbered event, in the same order: 1-2 short spoken sentences that explain why the step happens. Never add facts that are not in the events.
Then write 3 multiple-choice questions about this exact tree (4 options each; answer = index of the correct option) with a one-sentence explanation.`,
    prompt: states.map((s, i) => `${i + 1}. ${s.event}`).join("\n"),
  });
  const steps = states.map((s, i) => ({ ...s, say: r.data.narration[i]?.trim() || s.event }));
  const lesson: Lesson = { title: r.data.title, ops, steps, quiz: r.data.quiz };
  return { ...r, data: lesson };
}

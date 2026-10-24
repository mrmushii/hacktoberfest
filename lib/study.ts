import { z } from "zod/v4";
import { generate } from "@/lib/ai/client";
import { pagesForPrompt, rankPages } from "@/lib/docs/chunk";

const GROUNDED = "Use only the provided material. Cite the [page N] each point comes from. If the material does not cover something, say so.";

export function summarize(pages: string[]) {
  return generate({
    task: "study.summary@1",
    tier: "smart",
    schema: z.object({ points: z.array(z.object({ heading: z.string(), text: z.string(), page: z.number().int() })) }),
    system: `You write concise study summaries for university students. 5-8 points. ${GROUNDED}`,
    prompt: pagesForPrompt(pages),
  });
}

export function quiz(pages: string[]) {
  return generate({
    task: "study.quiz@1",
    tier: "smart",
    schema: z.object({
      questions: z.array(z.object({ question: z.string(), options: z.array(z.string()).length(4), answer: z.number().int().min(0).max(3), explanation: z.string(), page: z.number().int() })),
    }),
    system: `You write 5 multiple-choice questions testing understanding. answer = index of the correct option. ${GROUNDED}`,
    prompt: pagesForPrompt(pages),
  });
}

export function ask(pages: string[], question: string) {
  const pick = rankPages(pages, question);
  return generate({
    task: "study.ask@1",
    tier: "smart",
    schema: z.object({ answer: z.string(), pages: z.array(z.number().int()), covered: z.boolean() }),
    system: `You answer a student's question about their course material. ${GROUNDED} covered=false if the material does not answer it.`,
    prompt: `Material:\n${pagesForPrompt(pages, 10000, pick.length ? pick : undefined)}\n\nQuestion: ${question}`,
  });
}

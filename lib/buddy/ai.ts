import { z } from "zod/v4";
import { generate } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { pagesForPrompt, rankPages } from "@/lib/docs/chunk";
import { topicFrequency } from "@/lib/exam/analysis";
import { GROUNDED } from "@/lib/study";
import { courseMaterial, Mcq, topicNames } from "./material";
import { accuracy, weakTopics } from "./progress";

export type Goal = { text: string; topic: string; done: boolean };

/** Topic order is decided here: your weak spots, then what exams ask most, then the syllabus. The model only words the goals. */
export async function suggestGoals(userId: string, courseId: string) {
  const { course, topics, papers } = await courseMaterial(courseId);
  const past = await db.sessionEvent.findMany({ where: { session: { userId, courseId } } });
  const ranked = [...new Set([...weakTopics(past).map((w) => w.topic), ...topicFrequency(topics, papers).filter((t) => t.papers > 0).map((t) => t.topic), ...topics.map((t) => t.name)])].slice(0, 4);
  const r = await generate({
    task: "buddy.goals@1",
    tier: "fast",
    schema: z.object({ goals: z.array(z.object({ text: z.string(), topic: z.string() })).min(1).max(5) }),
    system: "You are a study buddy planning one focused study session (about 1-2 hours). Write one concrete, checkable goal per topic, in the given order, e.g. 'Explain how X works and solve 2 past-paper questions on it'. topic must be copied exactly from the list.",
    prompt: `Course: ${course.code} ${course.title}\nTopics in priority order:\n${(ranked.length ? ranked : ["General revision"]).map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
  });
  return { ...r, data: r.data.goals.map((g) => ({ ...g, done: false })) as Goal[] };
}

export async function explain(courseId: string, question: string) {
  const { course, topics, pages, labels } = await courseMaterial(courseId);
  const pick = rankPages(pages, question, 5);
  const r = await generate({
    task: "buddy.explain@1",
    tier: "smart",
    schema: z.object({ explanation: z.string(), steps: z.array(z.string()), covered: z.boolean(), topic: z.string(), pages: z.array(z.number().int()), check: Mcq }),
    system: `You are a patient study buddy. The student is stuck. Explain simply, then break it into short steps, then give one multiple-choice check question (answer = index). topic = the closest of: ${topicNames(topics)}. ${GROUNDED}`,
    prompt: `Course: ${course.code}\nMaterial:\n${pagesForPrompt(pages, 9000, pick.length ? pick : undefined)}\n\nStudent is stuck on: ${question}`,
  });
  return { ...r, data: { ...r.data, sources: r.data.pages.map((p) => labels[p - 1]).filter(Boolean) } };
}

export async function goalQuiz(courseId: string, topic: string) {
  const { pages } = await courseMaterial(courseId);
  const pick = rankPages(pages, topic, 4);
  return generate({
    task: "buddy.quiz@1",
    tier: "smart",
    schema: z.object({ questions: z.array(Mcq).min(1).max(3) }),
    system: `Write 3 multiple-choice questions testing understanding of "${topic}" (answer = index; topic = "${topic}"). ${GROUNDED}`,
    prompt: pagesForPrompt(pages, 8000, pick.length ? pick : undefined),
  });
}

export async function mockExam(userId: string, courseId: string, count = 10) {
  const { course, topics, pages, papers } = await courseMaterial(courseId);
  const weak = weakTopics(await db.sessionEvent.findMany({ where: { session: { userId, courseId } } })).map((w) => w.topic);
  const pastQs = papers.flatMap((p) => p.questions).filter((q) => !weak.length || weak.includes(q.topic ?? "")).slice(0, 12).map((q) => `- (${q.topic ?? "?"}) ${q.text}`);
  const pick = rankPages(pages, [...weak, ...pastQs].join(" "), 6);
  return generate({
    task: `buddy.mock@1:${count}`,
    tier: "smart",
    schema: z.object({ questions: z.array(Mcq).min(Math.min(5, count)).max(count) }),
    system: `Write a ${count}-question multiple-choice mock exam for ${course.code} ${course.title}. ${weak.length ? `About ${Math.round(count * 0.6)} questions must be on the student's weak topics: ${weak.join("; ")}. The rest spread over the syllabus.` : "Spread over the syllabus."} Model the style on the past questions. topic = one of: ${topicNames(topics)}. ${GROUNDED}`,
    prompt: `Past exam questions:\n${pastQs.join("\n") || "(none)"}\n\nMaterial:\n${pagesForPrompt(pages, 9000, pick.length ? pick : undefined)}`,
  });
}

/** Deterministic grading; the model never marks answers. */
export const grade = (questions: { answer: number }[], answers: (number | null)[]) => questions.map((q, i) => answers[i] === q.answer);

export async function endSession(sessionId: string) {
  const s = await db.studySession.findUniqueOrThrow({ where: { id: sessionId }, include: { events: true } });
  const course = await db.course.findUniqueOrThrow({ where: { id: s.courseId } });
  const goals = JSON.parse(s.goals) as Goal[];
  const endedAt = s.endedAt ?? new Date();
  const facts = {
    minutes: Math.max(1, Math.round((endedAt.getTime() - s.startedAt.getTime()) / 60000)),
    goalsDone: goals.filter((g) => g.done).length,
    goalsTotal: goals.length,
    accuracy: accuracy(s.events),
    weak: weakTopics(s.events),
    stuck: s.events.filter((e) => e.kind === "stuck" && !JSON.parse(e.detail).source).map((e) => (JSON.parse(e.detail) as { question: string }).question),
    voice: s.events.filter((e) => e.kind === "stuck" && JSON.parse(e.detail).source === "voice").map((e) => (JSON.parse(e.detail) as { question: string }).question),
  };
  const r = await generate({
    task: "buddy.report@1",
    tier: "fast",
    schema: z.object({ summary: z.string(), strengths: z.array(z.string()), review: z.array(z.string()), tomorrow: z.string() }),
    system: "You are a supportive study buddy writing an end-of-session report. Use only the facts given; be specific and encouraging, never invent scores.",
    prompt: `Course: ${course.code} ${course.title}\nGoals: ${goals.map((g) => `${g.done ? "[x]" : "[ ]"} ${g.text}`).join("\n")}\nFacts: ${JSON.stringify(facts)}`,
  });
  const report = { ...facts, ...r.data };
  await db.studySession.update({ where: { id: sessionId }, data: { endedAt, report: JSON.stringify(report) } });
  return { ...r, data: report };
}
export type Report = Awaited<ReturnType<typeof endSession>>["data"];

/** Lecture excerpts for a voice call, picked by what the student is working on and getting wrong. */
export async function voiceContext(sessionId: string) {
  const s = await db.studySession.findUniqueOrThrow({ where: { id: sessionId }, include: { events: true } });
  const { course, pages } = await courseMaterial(s.courseId);
  const goals = (JSON.parse(s.goals) as Goal[]).map((g) => `${g.done ? "[x]" : "[ ]"} ${g.text}`);
  const misses = s.events.filter((e) => e.kind === "wrong" || e.kind === "stuck").map((e) => `${e.topic ?? "?"}: ${(JSON.parse(e.detail) as { question?: string }).question ?? ""}`);
  const pick = rankPages(pages, [...goals, ...misses].join(" "), 3);
  return `Course: ${course.code} ${course.title}\nToday's goals:\n${goals.join("\n") || "(none)"}\nRecent mistakes:\n${misses.slice(-8).join("\n") || "(none)"}\nLecture excerpts:\n${pagesForPrompt(pages, 5000, pick.length ? pick : undefined)}`;
}

export type Confusion = { topic: string; question: string; resolved: boolean };

/** After a voice chat: what was the student confused about? Each becomes a `stuck` event so it feeds the report and weak topics. */
export async function voiceConfusions(sessionId: string, lines: { role: string; text: string }[]): Promise<Confusion[]> {
  const said = lines.filter((l) => l.text.trim()).map((l) => `${l.role === "user" ? "Student" : "Buddy"}: ${l.text}`).join("\n").slice(-6000);
  if (!lines.some((l) => l.role === "user" && l.text.trim())) return [];
  const s = await db.studySession.findUniqueOrThrow({ where: { id: sessionId } });
  const { topics } = await courseMaterial(s.courseId);
  const r = await generate({
    task: "buddy.voice@1",
    tier: "fast",
    schema: z.object({ confusions: z.array(z.object({ topic: z.string(), question: z.string(), resolved: z.boolean() })).max(5) }),
    system: `From a voice study chat, list what the student was confused about (their question in one sentence), the closest topic from: ${topicNames(topics)}, and whether the buddy's explanation resolved it (the student said they understood). Return [] if they were not confused about anything.`,
    prompt: said,
  });
  await db.sessionEvent.createMany({
    data: r.data.confusions.map((c) => ({ sessionId, kind: "stuck", topic: c.topic, detail: JSON.stringify({ question: c.question, resolved: c.resolved, source: "voice", transcript: said.slice(-4000) }) })),
  });
  return r.data.confusions;
}

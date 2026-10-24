import { handle } from "@/lib/api";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/profile";
import { endSession, explain, goalQuiz, grade, mockExam, suggestGoals, type Goal } from "@/lib/buddy/ai";
import type { Mcq } from "@/lib/buddy/material";

export const maxDuration = 600;

type Body = {
  action: "suggest" | "start" | "goals" | "stuck" | "quiz" | "answer" | "end" | "mock" | "mockSubmit";
  courseId?: string;
  sessionId?: string;
  goals?: Goal[];
  question?: string;
  topic?: string;
  correct?: boolean;
  detail?: unknown;
  questions?: Mcq[];
  answers?: (number | null)[];
};

export async function POST(req: Request) {
  return handle(async () => {
    const user = (await currentUser())!;
    const b = (await req.json()) as Body;
    // Every session action is scoped to its owner.
    const session = b.sessionId ? await db.studySession.findFirstOrThrow({ where: { id: b.sessionId, userId: user.id } }) : null;
    const need = () => {
      if (!session) throw new Error("Session not found");
      return session;
    };
    const log = (kind: string, topic: string | null | undefined, detail: unknown) => db.sessionEvent.create({ data: { sessionId: need().id, kind, topic: topic ?? null, detail: JSON.stringify(detail ?? {}) } });

    switch (b.action) {
      case "suggest":
        return suggestGoals(user.id, b.courseId!);
      case "start": {
        const goals = (b.goals ?? []).filter((g) => g.text.trim()).slice(0, 8);
        if (!goals.length) throw new Error("Add at least one goal");
        return db.studySession.create({ data: { userId: user.id, courseId: b.courseId!, goals: JSON.stringify(goals) } });
      }
      case "goals": {
        const before = JSON.parse(need().goals) as Goal[];
        for (const g of b.goals ?? []) if (g.done && !before.some((o) => o.text === g.text && o.done)) await log("goal_done", g.topic, { goal: g.text });
        return db.studySession.update({ where: { id: need().id }, data: { goals: JSON.stringify(b.goals ?? []) } });
      }
      case "stuck": {
        const r = await explain(need().courseId, b.question ?? "");
        await log("stuck", r.data.topic, { question: b.question });
        return r;
      }
      case "quiz":
        return goalQuiz(need().courseId, b.topic ?? "");
      case "answer":
        return log(b.correct ? "correct" : "wrong", b.topic, b.detail);
      case "end":
        return endSession(need().id);
      case "mock":
        return mockExam(user.id, need().courseId);
      case "mockSubmit": {
        const qs = b.questions ?? [];
        const marks = grade(qs, b.answers ?? []);
        for (const [i, q] of qs.entries()) await log(marks[i] ? "correct" : "wrong", q.topic, { question: q.question, chosen: b.answers?.[i] ?? null, answer: q.answer, mock: true });
        return { marks, score: marks.filter(Boolean).length, total: qs.length };
      }
    }
  });
}

import { db } from "@/lib/db";

type Ev = { kind: string; topic: string | null };

/** Mistakes per topic, worst first. wrong and stuck both count. */
export function weakTopics(events: Ev[]): { topic: string; misses: number; correct: number }[] {
  const m = new Map<string, { misses: number; correct: number }>();
  for (const e of events) {
    if (!e.topic) continue;
    const r = m.get(e.topic) ?? { misses: 0, correct: 0 };
    if (e.kind === "wrong" || e.kind === "stuck") r.misses++;
    if (e.kind === "correct") r.correct++;
    m.set(e.topic, r);
  }
  return [...m].map(([topic, r]) => ({ topic, ...r })).filter((r) => r.misses > 0).sort((a, b) => b.misses - a.misses || a.correct - b.correct);
}

export const accuracy = (events: Ev[]) => {
  const answered = events.filter((e) => e.kind === "correct" || e.kind === "wrong");
  return answered.length ? Math.round((100 * answered.filter((e) => e.kind === "correct").length) / answered.length) : null;
};

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Consecutive days up to today (or yesterday) with at least one session. */
export function streak(dates: Date[], today = new Date()): number {
  const days = new Set(dates.map(day));
  const d = new Date(today);
  if (!days.has(day(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(day(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export async function progress(userId: string, courseId?: string) {
  const sessions = await db.studySession.findMany({ where: { userId, ...(courseId ? { courseId } : {}) }, include: { events: true }, orderBy: { startedAt: "desc" } });
  const events = sessions.flatMap((s) => s.events);
  const minutes = sessions.reduce((t, s) => t + (s.endedAt ? (s.endedAt.getTime() - s.startedAt.getTime()) / 60000 : 0), 0);
  return {
    sessions,
    streak: streak(sessions.map((s) => s.startedAt)),
    minutes: Math.round(minutes),
    accuracy: accuracy(events),
    trend: sessions.filter((s) => s.endedAt).slice(0, 10).reverse().map((s) => accuracy(s.events)),
    weak: weakTopics(events).slice(0, 5),
  };
}

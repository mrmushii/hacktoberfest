import { db } from "@/lib/db";
import { currentUser, viewDept } from "@/lib/profile";
import { progress } from "@/lib/buddy/progress";
import type { Report } from "@/lib/buddy/ai";
import Link from "next/link";
import { DocUpload } from "@/components/client";
import { Card, Empty, PageTitle } from "@/components/ui";
import { BuddySession } from "./session";

export default async function Buddy({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course: initialCourse } = await searchParams;
  const user = (await currentUser())!;
  const allCourses = await db.course.findMany({ where: { department: viewDept(user) }, include: { documents: { select: { kind: true } } }, orderBy: { code: "asc" } });
  const courses = allCourses.filter((c) => c.documents.some((d) => d.kind === "lecture"));
  const p = await progress(user.id);
  const codes = Object.fromEntries((await db.course.findMany({ select: { id: true, code: true } })).map((c) => [c.id, c.code]));
  const open = p.sessions.find((s) => !s.endedAt && s.mode === "study");
  const past = p.sessions.filter((s) => s.report).slice(0, 5);

  return (
    <>
      <PageTitle title="Study Buddy" sub="Plan today's goals, get unstuck with explanations from your own lectures, and finish with a report or a mock exam." />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Streak" value={`${p.streak} day${p.streak === 1 ? "" : "s"}`} />
        <Stat label="Time studied" value={`${p.minutes} min`} />
        <Stat label="Accuracy" value={p.accuracy === null ? "—" : `${p.accuracy}%`}>
          <div className="mt-2 flex h-6 items-end gap-0.5" aria-label="Accuracy per session">
            {p.trend.map((a, i) => (
              <span key={i} className="w-2 rounded-sm bg-accent/70" style={{ height: `${Math.max(8, a ?? 0)}%` }} title={a === null ? "no questions" : `${a}%`} />
            ))}
          </div>
        </Stat>
        <Stat label="Needs work" value={p.weak[0]?.topic ?? "—"}>
          {p.weak.slice(1, 3).map((w) => (
            <div key={w.topic} className="truncate text-xs text-muted">{w.topic}</div>
          ))}
        </Stat>
      </div>
      <Card className="mb-4">
        {allCourses.length ? (
          <DocUpload courses={allCourses.map((c) => ({ id: c.id, label: `${c.code} · ${c.title}` }))} kind="lecture" label="Add lecture notes to study from" />
        ) : (
          <p className="text-sm">Add a course in <Link className="text-accent underline" href="/examgraph">ExamGraph</Link> first.</p>
        )}
      </Card>
      {courses.length === 0 ? (
        <Empty>Upload lecture notes above to start a session.</Empty>
      ) : (
        <BuddySession
          initialCourse={initialCourse}
          courses={courses.map((c) => ({ id: c.id, label: `${c.code} · ${c.title}` }))}
          resume={open ? { id: open.id, courseId: open.courseId, goals: JSON.parse(open.goals), startedAt: open.startedAt.toISOString(), mistakes: open.events.filter((e) => e.kind === "wrong" || e.kind === "stuck").map((e) => ({ kind: e.kind, topic: e.topic, detail: JSON.parse(e.detail) })) } : null}
        />
      )}
      {past.length > 0 && (
        <div className="mt-6 grid gap-3">
          <h2 className="font-semibold">Past sessions</h2>
          {past.map((s) => {
            const r = JSON.parse(s.report!) as Report;
            return (
              <Card key={s.id}>
                <div className="text-xs text-muted">
                  {codes[s.courseId]} · {s.startedAt.toLocaleDateString()} · {r.minutes} min · goals {r.goalsDone}/{r.goalsTotal}
                  {r.accuracy !== null && ` · ${r.accuracy}% correct`}
                </div>
                <p className="mt-1 text-sm">{r.summary}</p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
      {children}
    </Card>
  );
}

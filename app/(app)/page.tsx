import { db } from "@/lib/db";
import { topicFrequency, type Topic } from "@/lib/exam/analysis";
import { currentUser, fmtDue, viewDept } from "@/lib/profile";
import { progress, weakTopics } from "@/lib/buddy/progress";
import { Bento, type TileData } from "@/components/bento";

export default async function Home() {
  const user = (await currentUser())!;
  const dept = viewDept(user);
  const own = dept === user.department;
  // Own department: enrolled courses. Browsing another department: all its courses.
  const courses = await db.course.findMany({
    where: own ? { enrollments: { some: { userId: user.id } } } : { department: dept },
    include: { documents: { include: { questions: true } } },
    orderBy: { code: "asc" },
  });

  const [p, unread, tasks, change] = await Promise.all([
    progress(user.id),
    db.notification.count({ where: { userId: user.id, read: false } }),
    db.task.findMany({ where: { userId: user.id, done: false }, orderBy: { due: "asc" }, take: 3 }),
    db.noticeChange.findFirst({ where: { version: { notice: { department: dept } } }, orderBy: { version: { createdAt: "desc" } }, include: { version: true } }),
  ]);

  const top = courses
    .flatMap((c) => topicFrequency(JSON.parse(c.topics) as Topic[], c.documents.filter((d) => d.kind === "paper")).slice(0, 1).map((s) => ({ ...s, code: c.code })))
    .sort((a, b) => b.papers / b.totalPapers - a.papers / a.totalPapers)[0];
  const lectures = courses.reduce((n, c) => n + c.documents.filter((d) => d.kind === "lecture").length, 0);

  const live: Record<string, TileData> = {
    notices: {
      stat: unread ? `${unread} unread` : "All caught up",
      lines: change ? [`${change.version.title}`, `${change.field}: ${change.before ?? "—"} → ${change.after ?? "—"}`] : [`No recent changes in ${dept}`],
    },
    examgraph: top
      ? { stat: top.code, lines: [`Top topic: ${top.topic}`, `Appeared in ${top.papers} of ${top.totalPapers} papers`] }
      : { lines: ["Upload a syllabus and past papers to begin"] },
    planner: { stat: tasks.length ? `${tasks.length} upcoming` : undefined, lines: tasks.length ? tasks.map((t) => `${t.title} · ${fmtDue(t.due)}`) : ["Nothing scheduled"] },
    study: { lines: [lectures ? `${lectures} lecture document${lectures > 1 ? "s" : ""} ready` : "Add lecture notes to start"] },
    buddy: { stat: p.streak ? `${p.streak}-day streak` : undefined, lines: [p.weak[0] ? `Needs work: ${p.weak[0].topic}` : "Plan today's goals"] },
    tutor: { lines: ["Watch a BST solved step by step"] },
  };

  const weekAgo = Date.now() - 7 * 864e5;
  const open = p.sessions.find((s) => !s.endedAt && s.mode === "study");
  const openGoals = open ? (JSON.parse(open.goals) as { done: boolean }[]) : [];
  const codeOf = new Map(courses.map((c) => [c.id, c.code]));
  const today = {
    open: open ? { code: codeOf.get(open.courseId) ?? "", done: openGoals.filter((g) => g.done).length, total: openGoals.length } : null,
    streak: p.streak,
    minutesWeek: Math.round(p.sessions.filter((s) => s.endedAt && s.startedAt.getTime() > weekAgo).reduce((t, s) => t + (s.endedAt!.getTime() - s.startedAt.getTime()) / 60000, 0)),
    weak: p.weak[0]?.topic ?? null,
  };
  const weakByCourse = new Map(courses.map((c) => [c.id, weakTopics(p.sessions.filter((s) => s.courseId === c.id).flatMap((s) => s.events))[0]?.topic ?? null]));

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <Bento
      greeting={`${greet}, ${user.name.split(" ")[0]}`}
      sub={`${user.department} · Semester ${user.semester} · Section ${user.section}${user.university ? ` · ${user.university}` : ""}`}
      live={live}
      courses={courses.map((c) => ({ code: c.code, title: c.title, docs: c.documents.length, weak: weakByCourse.get(c.id) ?? null }))}
      today={today}
      next={{ tasks: tasks.map((t) => ({ title: t.title, due: fmtDue(t.due) })), unread, change: change ? `${change.version.title}: ${change.field} ${change.before ?? "—"} → ${change.after ?? "—"}` : null }}
      coursesLabel={own ? "My courses" : `${dept} courses`}
    />
  );
}

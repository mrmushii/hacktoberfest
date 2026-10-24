import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, fmtDue } from "@/lib/profile";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) return <Empty>No data yet. Run <code>npm run reset</code> to load demo data.</Empty>;
  const [tasks, notes, courses] = await Promise.all([
    db.task.findMany({ where: { userId: user.id, done: false }, orderBy: { due: "asc" }, take: 5 }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.course.findMany({ where: { department: user.department, semester: user.semester }, include: { _count: { select: { documents: true } } } }),
  ]);
  return (
    <>
      <PageTitle title={`Hi, ${user.name.split(" ")[0]}`} sub={`${user.department} · Semester ${user.semester} · Section ${user.section}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium">Upcoming</span>
            <Link href="/planner" className="text-xs text-accent">Planner →</Link>
          </div>
          {tasks.length === 0 && <p className="text-sm text-muted">Nothing scheduled.</p>}
          <ul className="space-y-2 text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex justify-between gap-3">
                <span>{t.title}</span>
                <span className="shrink-0 text-muted">{fmtDue(t.due)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium">Recent notices for you</span>
            <Link href="/notices" className="text-xs text-accent">Notice Board →</Link>
          </div>
          {notes.length === 0 && <p className="text-sm text-muted">No notifications.</p>}
          <ul className="space-y-2 text-sm">
            {notes.map((n) => (
              <li key={n.id}>
                <Link href={`/notices/${n.noticeId}`} className="hover:text-accent">
                  {!n.read && <Badge tone="blue">new</Badge>} {n.message}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 font-medium">My courses</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Card key={c.id}>
            <div className="text-xs text-muted">{c.code}</div>
            <div className="font-medium">{c.title}</div>
            <div className="mt-3 flex gap-3 text-xs">
              <Link href={`/examgraph/${c.code}`} className="text-accent">ExamGraph</Link>
              <Link href={`/study?course=${c.code}`} className="text-accent">Study</Link>
              <span className="text-muted">{c._count.documents} docs</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, fmtDue } from "@/lib/profile";
import { addTask, toggleTask } from "@/app/actions";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";

export default async function Planner() {
  const user = await currentUser();
  const tasks = user ? await db.task.findMany({ where: { userId: user.id }, orderBy: [{ done: "asc" }, { due: "asc" }] }) : [];
  return (
    <>
      <PageTitle title="Planner" sub="Exams and deadlines from confirmed notices appear here automatically." />
      <Card className="mb-5">
        <form action={addTask} className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1">
            <span className="label">Task</span>
            <input name="title" required className="input" placeholder="e.g. Finish lab report" />
          </label>
          <label>
            <span className="label">Due</span>
            <input name="due" type="date" required className="input" />
          </label>
          <button className="btn-primary">Add</button>
        </form>
      </Card>
      {tasks.length === 0 && <Empty>No tasks yet.</Empty>}
      <div className="grid gap-2">
        {tasks.map((t) => (
          <Card key={t.id} className={`flex items-center gap-3 py-3 ${t.done ? "opacity-50" : ""}`}>
            <form action={toggleTask}>
              <input type="hidden" name="id" value={t.id} />
              <button className={`h-5 w-5 rounded border ${t.done ? "border-accent bg-accent" : "border-line"}`} aria-label={t.done ? "Mark not done" : "Mark done"} />
            </form>
            <span className={`flex-1 text-sm ${t.done ? "line-through" : ""}`}>{t.title}</span>
            {t.noticeId && (
              <Link href={`/notices/${t.noticeId}`}>
                <Badge tone="blue">from notice</Badge>
              </Link>
            )}
            <span className="text-sm text-muted">{fmtDue(t.due)}</span>
          </Card>
        ))}
      </div>
    </>
  );
}

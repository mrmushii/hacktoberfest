import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, fmtDue, viewDept } from "@/lib/profile";
import { fieldsOf } from "@/lib/notices/service";
import { Badge, Button, Card, Empty, PageTitle } from "@/components/ui";

const VIEWS = [
  ["mine", "For me"],
  ["latest", "Latest"],
  ["updated", "Updated"],
  ["upcoming", "Upcoming"],
  ["all", "All"],
  ["archived", "Archived"],
] as const;

export default async function Notices({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const { view = "mine", q = "" } = await searchParams;
  const user = (await currentUser())!;
  const dept = viewDept(user);
  const own = dept === user.department;
  const notices = await db.notice.findMany({ include: { versions: { orderBy: { version: "desc" } } }, orderBy: { updatedAt: "desc" } });
  const today = new Date().toISOString().slice(0, 10);

  const rows = notices
    .map((n) => ({ n, f: fieldsOf(n.versions[0]), v: n.versions[0].version }))
    .filter(({ n, f, v }) => {
      if (q && !`${f.title} ${f.courseCode} ${n.versions[0].rawText}`.toLowerCase().includes(q.toLowerCase())) return false;
      const archived = n.status === "archived";
      if (view === "archived") return archived;
      if (archived) return false;
      if (view === "updated") return v > 1;
      if (view === "upcoming") return (f.date ?? f.deadline ?? "") >= today && !f.cancelled;
      // "Mine" = my batch; while browsing another department, everything from that department.
      if (view === "mine")
        return f.department === dept && (!own || ((f.semester === null || f.semester === user.semester) && (f.sections.length === 0 || f.sections.includes(user.section ?? ""))));
      return true;
    });
  if (view === "upcoming") rows.sort((a, b) => (a.f.date ?? a.f.deadline ?? "").localeCompare(b.f.date ?? b.f.deadline ?? ""));
  if (view === "latest") rows.splice(10);

  return (
    <>
      <PageTitle title="Notice Board" sub="Every version is kept. Changes are detected field by field." action={<Button href="/notices/new">Upload notice</Button>} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {VIEWS.map(([k, label]) => (
          <Link key={k} href={`/notices?view=${k}`} className={`rounded-lg px-3 py-1.5 text-sm ${view === k ? "bg-ink text-bg" : "text-muted hover:bg-subtle"}`}>
            {label}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder="Search notices…" className="input w-56" />
        </form>
      </div>
      {rows.length === 0 && <Empty>No notices in this view.</Empty>}
      <div className="grid gap-3">
        {rows.map(({ n, f, v }) => (
          <Link key={n.id} href={`/notices/${n.id}`}>
            <Card className="transition hover:border-accent">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{f.title}</div>
                  <div className="mt-1 text-sm text-muted">
                    {f.department}
                    {f.semester ? ` · Semester ${f.semester}` : ""}
                    {f.sections.length ? ` · Section ${f.sections.join(", ")}` : " · All sections"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {f.cancelled && <Badge tone="red">Cancelled</Badge>}
                  {v > 1 && <Badge tone="amber">Updated · v{v}</Badge>}
                  <Badge>{f.eventType}</Badge>
                </div>
              </div>
              {(f.date || f.deadline) && (
                <div className="mt-3 text-sm">
                  {fmtDue(f.date ?? f.deadline!)}
                  {f.time && ` · ${f.time}`}
                  {f.room && ` · Room ${f.room}`}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

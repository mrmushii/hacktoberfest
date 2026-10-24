import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, viewDept } from "@/lib/profile";
import { Card, PageTitle } from "@/components/ui";

export default async function ExamGraphHome({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const dept = viewDept((await currentUser())!);
  const all = !!(await searchParams).all;
  const courses = await db.course.findMany({ where: all ? {} : { department: dept }, include: { _count: { select: { documents: true } } }, orderBy: { code: "asc" } });
  return (
    <>
      <PageTitle
        title="ExamGraph"
        sub={`Map past-paper questions to syllabus topics and see what actually comes up. Showing ${all ? "all departments" : dept}.`}
        action={
          <Link href={all ? "/examgraph" : "/examgraph?all=1"} className="btn-ghost">
            {all ? `Only ${dept}` : "All departments"}
          </Link>
        }
      />
      <p className="mb-4 text-sm text-muted">
        Missing a course? <Link href="/courses" className="text-accent underline">Add it in Courses</Link> and upload its files there.
      </p>
      {courses.length === 0 && <p className="text-sm text-muted">No {dept} courses yet.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Link key={c.id} href={`/examgraph/${c.code}`}>
            <Card className="transition hover:border-accent">
              <div className="text-xs text-muted">{c.code}</div>
              <div className="font-medium">{c.title}</div>
              <div className="mt-2 text-xs text-muted">{c._count.documents} documents</div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

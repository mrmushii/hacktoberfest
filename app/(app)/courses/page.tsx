import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/profile";
import { addCourse } from "@/app/actions";
import { Card, PageTitle } from "@/components/ui";

export default async function Courses() {
  const user = (await currentUser())!;
  const mine = await db.course.findMany({
    where: { enrollments: { some: { userId: user.id } } },
    include: { documents: { select: { kind: true } } },
    orderBy: { code: "asc" },
  });
  const count = (docs: { kind: string }[], k: string) => docs.filter((d) => d.kind === k).length;

  return (
    <>
      <PageTitle title="Courses" sub="Add your courses and upload their syllabus, lecture notes and past papers. Every tool reads from here." />
      <Card className="mb-6">
        <form action={addCourse} className="flex flex-wrap items-end gap-3">
          <label className="w-40">
            <span className="label">Course code</span>
            <input name="code" className="input" placeholder="CSE-301" required pattern="[A-Za-z0-9 -]{2,20}" />
          </label>
          <label className="min-w-60 flex-1">
            <span className="label">Title</span>
            <input name="title" className="input" placeholder="Data Structures" required maxLength={120} />
          </label>
          <button className="btn-primary">
            <Plus size={16} /> Add course
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">If a classmate already added the code, you join the same course and see its files.</p>
      </Card>
      {mine.length === 0 ? (
        <p className="text-sm text-muted">No courses yet. Add your first one above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((c) => (
            <Link key={c.id} href={`/courses/${c.code}`}>
              <Card className="h-full transition hover:border-accent">
                <div className="text-xs text-muted">{c.code}</div>
                <div className="font-medium">{c.title}</div>
                <div className="mt-3 flex gap-3 text-xs text-muted">
                  <span>{count(c.documents, "syllabus") ? "✓ syllabus" : "no syllabus"}</span>
                  <span>{count(c.documents, "lecture")} lectures</span>
                  <span>{count(c.documents, "paper")} papers</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

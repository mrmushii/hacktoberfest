import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/profile";
import { deleteDocument, leaveCourse } from "@/app/actions";
import { DocUpload } from "@/components/client";
import { Card, PageTitle } from "@/components/ui";

const KINDS = [
  { kind: "syllabus", label: "Syllabus", hint: "Topics are read from it, so do this first." },
  { kind: "lecture", label: "Lecture notes", hint: "Used by Study, Study Buddy and mock quizzes." },
  { kind: "paper", label: "Past papers", hint: "Questions are mapped to syllabus topics in ExamGraph." },
] as const;

export default async function CourseHub({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = (await currentUser())!;
  const course = await db.course.findUnique({ where: { code: decodeURIComponent(code) }, include: { documents: { orderBy: { createdAt: "desc" } }, enrollments: { where: { userId: user.id } } } });
  if (!course) notFound();
  const enrolled = course.enrollments.length > 0;

  return (
    <>
      <PageTitle
        title={`${course.code} · ${course.title}`}
        sub={`${course.documents.length} file${course.documents.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="btn-ghost" href={`/examgraph/${course.code}`}>ExamGraph</Link>
            <Link className="btn-ghost" href={`/study?course=${course.code}`}>Study</Link>
            <Link className="btn-primary" href={`/buddy?course=${course.id}`}>Study Buddy</Link>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {KINDS.map((k) => {
          const docs = course.documents.filter((d) => d.kind === k.kind);
          return (
            <Card key={k.kind}>
              <DocUpload courseId={course.id} kind={k.kind} label={k.label} />
              <p className="mt-1 text-xs text-muted">{k.hint}</p>
              <ul className="mt-4 grid gap-1.5 text-sm">
                {docs.length === 0 && <li className="text-xs text-muted">Nothing uploaded yet.</li>}
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate" title={d.name}>{d.name}</span>
                    <span className="text-xs text-muted">{(JSON.parse(d.pages) as string[]).length}p</span>
                    {enrolled && (
                      <form action={deleteDocument}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="rounded p-1 text-muted hover:bg-subtle hover:text-red-600" aria-label={`Delete ${d.name}`}>
                          <Trash2 size={14} />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      {enrolled && (
        <form action={leaveCourse} className="mt-8">
          <input type="hidden" name="courseId" value={course.id} />
          <button className="text-xs text-muted underline hover:text-red-600">Leave this course</button>
        </form>
      )}
    </>
  );
}

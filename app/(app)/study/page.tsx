import { db } from "@/lib/db";
import { currentUser, viewDept } from "@/lib/profile";
import Link from "next/link";
import { DocUpload } from "@/components/client";
import { Card, Empty, PageTitle } from "@/components/ui";
import { StudyTool } from "./tool";

export default async function Study({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const dept = viewDept((await currentUser())!);
  const docs = await db.courseDocument.findMany({
    where: { kind: { in: ["lecture", "syllabus"] }, course: course ? { code: course } : { department: dept } },
    include: { course: true },
    orderBy: { name: "asc" },
  });
  const courses = await db.course.findMany({ where: { department: dept }, orderBy: { code: "asc" } });
  return (
    <>
      <PageTitle title="Study Assistant" sub="Summaries, quizzes and answers grounded in your own lecture material, with page references." />
      <Card className="mb-4">
        {courses.length ? (
          <DocUpload courses={courses.map((c) => ({ id: c.id, label: `${c.code} · ${c.title}` }))} kind="lecture" label="Add lecture notes" />
        ) : (
          <p className="text-sm">Add a course in <Link className="text-accent underline" href="/examgraph">ExamGraph</Link> first, then upload its lecture notes here.</p>
        )}
      </Card>
      {docs.length === 0 ? (
        <Empty>No lecture notes yet. Upload some above.</Empty>
      ) : (
        <StudyTool docs={docs.map((d) => ({ id: d.id, label: `${d.course.code} · ${d.name}`, pages: JSON.parse(d.pages) as string[] }))} />
      )}
    </>
  );
}

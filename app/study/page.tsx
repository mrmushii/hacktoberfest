import { db } from "@/lib/db";
import { Empty, PageTitle } from "@/components/ui";
import { StudyTool } from "./tool";

export default async function Study({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const docs = await db.courseDocument.findMany({
    where: { kind: { in: ["lecture", "syllabus"] }, ...(course && { course: { code: course } }) },
    include: { course: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageTitle title="Study Assistant" sub="Summaries, quizzes and answers grounded in your own lecture material, with page references." />
      {docs.length === 0 ? (
        <Empty>Upload lecture notes from a course&apos;s ExamGraph page first.</Empty>
      ) : (
        <StudyTool docs={docs.map((d) => ({ id: d.id, label: `${d.course.code} · ${d.name}`, pages: JSON.parse(d.pages) as string[] }))} />
      )}
    </>
  );
}

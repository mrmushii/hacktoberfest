import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { topicFrequency, type Topic } from "@/lib/exam/analysis";
import { remap, setQuestionTopic } from "@/app/actions";
import { DocUpload } from "@/components/client";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { Practice } from "./practice";

export default async function CourseGraph({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const course = await db.course.findUnique({
    where: { code },
    include: { documents: { orderBy: { name: "asc" }, include: { questions: { orderBy: { number: "asc" } } } } },
  });
  if (!course) notFound();
  const topics = JSON.parse(course.topics) as Topic[];
  const papers = course.documents.filter((d) => d.kind === "paper");
  const stats = topicFrequency(topics, papers);
  const max = Math.max(1, ...stats.flatMap((s) => Object.values(s.byPaper).map((q) => q.length)));
  const review = papers.flatMap((p) => p.questions.filter((q) => q.topic === null || (q.confidence ?? 0) < 0.6).map((q) => ({ ...q, paper: p.name })));

  return (
    <>
      <PageTitle title={`${course.code} · ${course.title}`} sub="Frequencies are counted from extracted questions — history, not a prediction." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <DocUpload courseId={course.id} kind="syllabus" label={`Syllabus ${topics.length ? `(${topics.length} topics)` : ""}`} />
        </Card>
        <Card>
          <DocUpload courseId={course.id} kind="paper" label={`Past paper (${papers.length} uploaded)`} />
        </Card>
        <Card>
          <DocUpload courseId={course.id} kind="lecture" label={`Lecture notes (${course.documents.filter((d) => d.kind === "lecture").length})`} />
        </Card>
      </div>

      {!topics.length ? (
        <Empty>Upload the syllabus first so questions can be mapped to topics.</Empty>
      ) : !papers.length ? (
        <Empty>Upload past papers to see topic frequency.</Empty>
      ) : (
        <Card className="mb-6 overflow-x-auto">
          <div className="mb-3 font-medium">Topic × paper heatmap</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 pr-3">Topic</th>
                {papers.map((p) => (
                  <th key={p.id} className="px-1 py-2 text-center font-normal">
                    {p.name.replace(/\.(pdf|txt)$/i, "")}
                  </th>
                ))}
                <th className="px-3 py-2">Appeared</th>
                <th className="px-3 py-2">Marks</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.topic} className="border-t border-line">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{s.topic}</div>
                    <div className="text-xs text-muted">{s.module}</div>
                  </td>
                  {papers.map((p) => {
                    const qs = s.byPaper[p.id] ?? [];
                    return (
                      <td key={p.id} className="px-1 py-1">
                        <details className="relative">
                          <summary
                            className="flex h-9 min-w-12 cursor-pointer list-none items-center justify-center rounded-md text-xs font-medium"
                            style={{ background: qs.length ? `color-mix(in srgb, var(--accent) ${20 + (qs.length / max) * 70}%, transparent)` : "var(--subtle)" }}
                            title={`${qs.length} question(s)`}
                          >
                            {qs.length || ""}
                          </summary>
                          {qs.length > 0 && (
                            <div className="absolute z-10 mt-1 w-72 rounded-lg border border-line bg-panel p-3 text-xs shadow-lg">
                              {qs.map((q) => (
                                <p key={q.number} className="mb-2">
                                  <b>Q{q.number}</b> {q.text} <span className="text-muted">(p.{q.page}{q.marks ? `, ${q.marks} marks` : ""})</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </details>
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-2">
                    {s.papers} of {s.totalPapers} papers
                  </td>
                  <td className="px-3 py-2">{s.marks || "—"}</td>
                  <td className="py-2">{s.papers > 0 && <Practice courseId={course.id} topic={s.topic} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {papers.length > 0 && topics.length > 0 && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-medium">Review topic assignments</span>
            <Badge tone={review.length ? "amber" : "green"}>{review.length} need review</Badge>
            <form action={remap} className="ml-auto">
              <input type="hidden" name="courseId" value={course.id} />
              <button className="btn-ghost text-xs">Re-map all with AI</button>
            </form>
          </div>
          <div className="divide-y divide-line">
            {papers.flatMap((p) =>
              p.questions.map((q) => (
                <form key={q.id} action={setQuestionTopic} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <input type="hidden" name="id" value={q.id} />
                  <span className="w-28 shrink-0 text-xs text-muted">
                    {p.name.replace(/\.(pdf|txt)$/i, "")} · Q{q.number}
                  </span>
                  <span className="min-w-0 flex-1">{q.text}</span>
                  {(q.confidence ?? 0) < 0.6 && <Badge tone="amber">{q.topic ? `${Math.round((q.confidence ?? 0) * 100)}%` : "unmapped"}</Badge>}
                  <select name="topic" defaultValue={q.topic ?? ""} className="input w-48 py-1">
                    <option value="">— none —</option>
                    {topics.map((t) => (
                      <option key={t.name}>{t.name}</option>
                    ))}
                  </select>
                  <button className="btn-ghost py-1 text-xs">Save</button>
                </form>
              )),
            )}
          </div>
        </Card>
      )}
    </>
  );
}

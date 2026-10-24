import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDue } from "@/lib/profile";
import { fieldsOf } from "@/lib/notices/service";
import { archiveNotice } from "@/app/actions";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function NoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notice = await db.notice.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" }, include: { changes: true } }, _count: { select: { notifications: true } } } });
  if (!notice) notFound();
  const latest = fieldsOf(notice.versions[0]);

  return (
    <>
      <PageTitle
        title={latest.title}
        sub={`${latest.department}${latest.courseCode ? ` · ${latest.courseCode}` : ""} · ${notice.versions.length} version(s) · ${notice._count.notifications} notifications sent`}
        action={
          notice.status !== "archived" && (
            <form action={archiveNotice}>
              <input type="hidden" name="id" value={notice.id} />
              <button className="btn-ghost">Archive</button>
            </form>
          )
        }
      />
      <div className="grid gap-4">
        {notice.versions.map((v) => {
          const f = fieldsOf(v);
          return (
            <Card key={v.id}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-medium">Version {v.version}</span>
                {v.version === notice.versions[0].version && <Badge tone="green">Current</Badge>}
                {f.cancelled && <Badge tone="red">Cancelled</Badge>}
                <span className="text-xs text-muted">
                  {v.sourceName} · {v.createdAt.toLocaleString("en-GB")}
                </span>
              </div>
              {v.changes.length > 0 && (
                <div className="mb-4 overflow-x-auto rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th className="px-3 py-2">Changed</th>
                        <th className="px-3 py-2">Before (v{v.version - 1})</th>
                        <th className="px-3 py-2">After (v{v.version})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.changes.map((c) => (
                        <tr key={c.id} className="border-t border-amber-500/20">
                          <td className="px-3 py-2 font-medium capitalize">{c.field}</td>
                          <td className="px-3 py-2 text-muted line-through">{c.before ?? "—"}</td>
                          <td className="px-3 py-2 font-medium">{c.after ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {v.version > 1 && v.changes.length === 0 && <p className="mb-3 text-sm text-muted">No field changes from the previous version.</p>}
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {[
                  ["Date", f.date && fmtDue(f.date)],
                  ["Time", f.time],
                  ["Room", f.room],
                  ["Deadline", f.deadline && fmtDue(f.deadline)],
                  ["Semester", f.semester],
                  ["Sections", f.sections.join(", ") || "All"],
                ].map(([k, val]) => (
                  <div key={String(k)}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd>{val ?? "—"}</dd>
                  </div>
                ))}
              </dl>
              {f.actions.length > 0 && (
                <ul className="mt-3 list-disc pl-5 text-sm">
                  {f.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted">Evidence & source text</summary>
                <ul className="mt-2 space-y-1">
                  {f.evidence.map((e, i) => (
                    <li key={i}>
                      <span className="text-xs text-muted">{e.field}:</span> “{e.quote}”
                    </li>
                  ))}
                </ul>
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-subtle p-3 font-mono text-xs">{v.rawText}</pre>
              </details>
            </Card>
          );
        })}
      </div>
    </>
  );
}

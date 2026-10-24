"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Elapsed } from "@/components/client";
import { Quiz } from "@/components/quiz";
import { AiBadge, Card } from "@/components/ui";

type Doc = { id: string; label: string; pages: string[] };
type Ai = { cached: boolean; durationMs: number; model: string };
type Summary = { points: { heading: string; text: string; page: number }[] };
type Quiz = { questions: { question: string; options: string[]; answer: number; explanation: string; page: number }[] };
type Answer = { answer: string; pages: number[]; covered: boolean };
type Out = (Ai & { action: "summary"; data: Summary }) | (Ai & { action: "quiz"; data: Quiz }) | (Ai & { action: "ask"; data: Answer });

export function StudyTool({ docs }: { docs: Doc[] }) {
  const [docId, setDocId] = useState(docs[0].id);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Out | null>(null);
  const [err, setErr] = useState("");
  const [page, setPage] = useState<number | null>(null);
  const doc = docs.find((d) => d.id === docId)!;

  async function run(action: Out["action"], question?: string) {
    setBusy(true);
    setErr("");
    setOut(null);
    const r = await fetch("/api/study", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentId: docId, action, question }) });
    const body = await r.json();
    setBusy(false);
    if (!r.ok) setErr(body.error);
    else setOut({ ...body, action });
  }
  const cite = (p: number) => (
    <button onClick={() => setPage(p)} className="ml-1 rounded bg-subtle px-1.5 text-xs text-accent hover:underline">
      p.{p}
    </button>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-4">
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-60 flex-1">
              <span className="label">Material</span>
              <select className="input" value={docId} onChange={(e) => (setDocId(e.target.value), setOut(null))}>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn-primary" disabled={busy} onClick={() => run("summary")}>Summarise</button>
            <button className="btn-ghost" disabled={busy} onClick={() => run("quiz")}>Quiz me</button>
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              if (q) run("ask", String(q));
            }}
          >
            <input name="q" className="input" placeholder="Ask a question about this material…" />
            <button className="btn-ghost" disabled={busy}>Ask</button>
          </form>
          {busy && (
            <div className="mt-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> <Elapsed />
            </div>
          )}
        </Card>
        {err && <Card className="text-sm text-red-600">⚠ {err}</Card>}
        {out && (
          <Card>
            <div className="mb-3">
              <AiBadge ai={out} />
            </div>
            {out.action === "summary" && (
              <ul className="space-y-3 text-sm">
                {out.data.points.map((p, i) => (
                  <li key={i}>
                    <b>{p.heading}.</b> {p.text}
                    {cite(p.page)}
                  </li>
                ))}
              </ul>
            )}
            {out.action === "ask" && (
              <div className="text-sm">
                {!out.data.covered && <p className="mb-2 text-amber-600">The material doesn&apos;t fully cover this.</p>}
                <p>{out.data.answer}</p>
                <div className="mt-2">Sources: {out.data.pages.map(cite)}</div>
              </div>
            )}
            {out.action === "quiz" && (
              <Quiz questions={out.data.questions} after={(q) => cite(q.page)} />
            )}
          </Card>
        )}
      </div>
      <Card className="max-h-[75vh] overflow-y-auto">
        <div className="mb-2 text-xs font-medium text-muted">{page ? `Source · page ${page}` : "Click a page reference to view the source"}</div>
        {page && <pre className="whitespace-pre-wrap font-mono text-xs">{doc.pages[page - 1] ?? "Page not found in this document."}</pre>}
      </Card>
    </div>
  );
}

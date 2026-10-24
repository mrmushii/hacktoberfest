"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AiBadge } from "@/components/ui";

type Res = { data: { questions: { question: string; hint: string; page: number | null }[] }; cached: boolean; durationMs: number; model: string; lecture: { name: string } | null };

export function Practice({ courseId, topic }: { courseId: string; topic: string }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState("");
  async function run() {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/examgraph/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseId, topic }) });
    const body = await r.json();
    setBusy(false);
    if (!r.ok) setErr(body.error);
    else setRes(body);
  }
  return (
    <>
      <button onClick={run} disabled={busy} className="btn-ghost whitespace-nowrap py-1 text-xs">
        {busy && <Loader2 size={12} className="animate-spin" />} Practice
      </button>
      {(res || err) && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => (setRes(null), setErr(""))}>
          <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-xl bg-panel p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-medium">Practice: {topic}</span>
              {res && <AiBadge ai={res} />}
            </div>
            {err && <p className="text-sm text-red-600">⚠ {err}</p>}
            <ol className="list-decimal space-y-3 pl-5 text-sm">
              {res?.data.questions.map((q, i) => (
                <li key={i}>
                  {q.question}
                  <div className="mt-1 text-xs text-muted">
                    Hint: {q.hint}
                    {q.page && res.lecture && ` · see ${res.lecture.name} p.${q.page}`}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}

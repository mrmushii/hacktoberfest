"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { NoticeFields } from "@/lib/notices/schema";
import type { Match } from "@/lib/notices/match";
import type { FieldChange } from "@/lib/notices/diff";
import { AiBadge, Badge, Card } from "@/components/ui";

type Analysis = {
  fields: NoticeFields;
  rawText: string;
  match: Match;
  changes: FieldChange[];
  ai: { cached: boolean; durationMs: number; model: string };
  sourceName: string;
  contentHash: string;
};

const EDITABLE: [keyof NoticeFields, string][] = [
  ["title", "Title"],
  ["department", "Department"],
  ["courseCode", "Course code"],
  ["eventName", "Event"],
  ["semester", "Semester"],
  ["sections", "Sections (comma separated, blank = all)"],
  ["date", "Date (YYYY-MM-DD)"],
  ["time", "Time (HH:MM)"],
  ["room", "Room"],
  ["deadline", "Deadline (YYYY-MM-DD)"],
];

export function NoticeUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "analyze" | "publish">("");
  const [error, setError] = useState("");
  const [a, setA] = useState<Analysis | null>(null);
  const [asNew, setAsNew] = useState(false);
  const [started, setStarted] = useState(0);

  async function analyze(form: FormData) {
    setBusy("analyze");
    setError("");
    setA(null);
    setStarted(Date.now());
    const res = await fetch("/api/notices/analyze", { method: "POST", body: form });
    const body = await res.json();
    // Cache hits return instantly; keep a short "replaying" state so the demo reads clearly.
    if (body.ai?.cached) await new Promise((r) => setTimeout(r, 900));
    setBusy("");
    if (!res.ok) return setError(body.error);
    setA(body);
    setAsNew(body.match.kind === "new");
  }

  function setField(k: keyof NoticeFields, v: string) {
    if (!a) return;
    const value = k === "sections" ? v.split(",").map((s) => s.trim()).filter(Boolean) : k === "semester" ? (v ? Number(v) : null) : v || null;
    setA({ ...a, fields: { ...a.fields, [k]: value } });
  }

  async function publish() {
    if (!a) return;
    setBusy("publish");
    const res = await fetch("/api/notices/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields: a.fields, rawText: a.rawText, sourceName: a.sourceName, contentHash: a.contentHash, target: asNew ? { kind: "new" } : a.match }),
    });
    const body = await res.json();
    setBusy("");
    if (!res.ok) return setError(body.error);
    router.push(`/notices/${body.noticeId}`);
    router.refresh();
  }

  const f = a?.fields;
  return (
    <div className="grid gap-5">
      <Card>
        <form action={analyze} className="grid gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-line p-6 text-sm text-muted hover:border-accent">
            <Upload size={20} />
            <span>PDF, photo of a notice board (JPG/PNG) or .txt</span>
            <input type="file" name="file" accept=".pdf,image/*,.txt" className="text-xs" />
          </label>
          <div>
            <span className="label">…or paste forwarded text</span>
            <textarea name="text" rows={4} className="input font-mono" placeholder="Paste the notice text here" />
          </div>
          <button className="btn-primary w-fit" disabled={!!busy}>
            {busy === "analyze" ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy === "analyze" ? "Analysing…" : "Analyse notice"}
          </button>
          {busy === "analyze" && <Elapsed since={started} />}
        </form>
      </Card>

      {error && <Card className="border-red-500/40 text-sm text-red-600 dark:text-red-400">⚠ {error}</Card>}

      {a && f && (
        <>
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="font-medium">Extracted details</span>
              <AiBadge ai={a.ai} />
              {f.uncertain.length > 0 && <Badge tone="amber">Check: {f.uncertain.join(", ")}</Badge>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {EDITABLE.map(([k, label]) => {
                const v = f[k];
                return (
                  <label key={k}>
                    <span className="label">
                      {label} {f.uncertain.includes(k) && <span className="text-amber-600">· uncertain</span>}
                    </span>
                    <input
                      className={`input ${f.uncertain.includes(k) ? "border-amber-500" : ""}`}
                      value={Array.isArray(v) ? v.join(", ") : v === null || v === undefined ? "" : String(v)}
                      onChange={(e) => setField(k, e.target.value)}
                    />
                  </label>
                );
              })}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.cancelled} onChange={(e) => setA({ ...a, fields: { ...f, cancelled: e.target.checked } })} /> Cancelled
              </label>
            </div>
            {f.evidence.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted">Evidence from the source</summary>
                <ul className="mt-2 space-y-1">
                  {f.evidence.map((e, i) => (
                    <li key={i}>
                      <span className="text-xs text-muted">{e.field}:</span> “{e.quote}”
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>

          <Card>
            <div className="mb-3 font-medium">Version match</div>
            {a.match.kind === "update" ? (
              <>
                <p className="text-sm">
                  {a.match.certain ? "✓" : "⚠"} {a.match.reason}.{" "}
                  <a className="text-accent" href={`/notices/${a.match.noticeId}`} target="_blank">
                    View existing notice
                  </a>
                </p>
                {a.changes.length > 0 ? (
                  <table className="mt-3 w-full text-sm">
                    <tbody>
                      {a.changes.map((c) => (
                        <tr key={c.field} className="border-t border-line">
                          <td className="py-2 pr-3 font-medium">{c.label}</td>
                          <td className="py-2 pr-3 text-muted line-through">{c.before ?? "—"}</td>
                          <td className="py-2 font-medium">→ {c.after ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-2 text-sm text-muted">No field changes detected.</p>
                )}
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={asNew} onChange={(e) => setAsNew(e.target.checked)} /> This is a different notice — publish separately
                </label>
              </>
            ) : (
              <p className="text-sm text-muted">No earlier version found. This will be published as a new notice.</p>
            )}
          </Card>

          <button className="btn-primary w-fit" onClick={publish} disabled={!!busy}>
            {busy === "publish" && <Loader2 size={16} className="animate-spin" />}
            Confirm & publish {!asNew && a.match.kind === "update" ? "as new version" : ""}
          </button>
        </>
      )}
    </div>
  );
}

function Elapsed({ since }: { since: number }) {
  const [, tick] = useState(0);
  setTimeout(() => tick((t) => t + 1), 1000);
  return <p className="text-xs text-muted">Running on the local model… {Math.round((Date.now() - since) / 1000)}s (first run loads the model)</p>;
}

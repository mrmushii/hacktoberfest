"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MAX_UPLOAD_MB, tooBig, UPLOAD_ACCEPT } from "@/lib/docs/accept";
import { withOcr } from "@/lib/ocr";

export function Elapsed({ label = "Running on the local model" }: { label?: string }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="text-xs text-muted">
      {label}… {s}s
    </p>
  );
}

/** Upload one course document (syllabus / lecture / paper) and refresh the page. Pass `courses` to let the student pick one. */
export function DocUpload({ courseId, courses, kind, label }: { courseId?: string; courses?: { id: string; label: string }[]; kind: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  async function submit(form: FormData) {
    setMsg("");
    const file = form.get("file");
    const big = file instanceof File ? tooBig(file) : "";
    if (big) return setMsg(`⚠ ${big}`);
    if (courseId) form.set("courseId", courseId);
    form.set("kind", kind);
    setBusy("Reading photo…");
    await withOcr(form);
    setBusy("Analysing…");
    try {
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const body = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
      setMsg(res.ok ? (body.reused ? "Already analysed — reused stored result." : "Done.") : `⚠ ${body.error}`);
      if (res.ok) router.refresh();
    } catch {
      setMsg("⚠ Couldn't reach the server.");
    } finally {
      setBusy("");
    }
  }
  return (
    <form action={submit} className="grid gap-2">
      <span className="label">{label}</span>
      {!courseId && courses && (
        <select name="courseId" className="input" required aria-label="Course">
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      )}
      <input type="file" name="file" accept={UPLOAD_ACCEPT} required className="text-xs" />
      <p className="text-xs text-muted">PDF, Word, PowerPoint, text or a photo · up to {MAX_UPLOAD_MB} MB</p>
      <button className="btn-ghost w-fit" disabled={Boolean(busy)}>
        {busy && <Loader2 size={14} className="animate-spin" />} Upload &amp; analyse
      </button>
      {busy && <Elapsed label={busy.replace("…", "")} />}
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </form>
  );
}

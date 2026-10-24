"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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

/** Upload one course document (syllabus / lecture / paper) and refresh the page. */
export function DocUpload({ courseId, kind, label }: { courseId: string; kind: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function submit(form: FormData) {
    setBusy(true);
    setMsg("");
    form.set("courseId", courseId);
    form.set("kind", kind);
    const res = await fetch("/api/documents", { method: "POST", body: form });
    const body = await res.json();
    setBusy(false);
    setMsg(res.ok ? (body.reused ? "Already analysed — reused stored result." : "Done.") : `⚠ ${body.error}`);
    if (res.ok) router.refresh();
  }
  return (
    <form action={submit} className="grid gap-2">
      <span className="label">{label}</span>
      <input type="file" name="file" accept=".pdf,.txt" required className="text-xs" />
      <button className="btn-ghost w-fit" disabled={busy}>
        {busy && <Loader2 size={14} className="animate-spin" />} Upload & analyse
      </button>
      {busy && <Elapsed />}
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </form>
  );
}

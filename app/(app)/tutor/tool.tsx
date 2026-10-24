"use client";

import { useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Elapsed } from "@/components/client";
import { AiBadge, Card } from "@/components/ui";
import { Player } from "@/components/tutor/player";
import { tooBig, UPLOAD_ACCEPT } from "@/lib/docs/accept";
import { ocrImage } from "@/lib/ocr";
import { DEMO_TEXT, PRESETS } from "@/lib/tutor/demo";
import type { Lesson } from "@/lib/tutor/lesson";

type Out = { data: Lesson; cached: boolean; durationMs: number; model: string; provider?: string };

export function TutorTool() {
  const [text, setText] = useState(DEMO_TEXT);
  const [doc, setDoc] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [warn, setWarn] = useState("");
  const [out, setOut] = useState<Out | null>(null);
  const [open, setOpen] = useState(false);

  async function onFile(file: File | undefined) {
    setWarn("");
    setErr("");
    if (!file) return;
    const big = tooBig(file);
    if (big) return setErr(big);
    if (!file.type.startsWith("image/")) return setDoc(file);
    setBusy("Reading image…");
    try {
      const r = await ocrImage(file);
      setText(r.text);
      if (r.confidence < 60) setWarn(`OCR confidence is low (${r.confidence}%). Check the text before generating.`);
    } catch {
      setErr("Couldn't read that image.");
    } finally {
      setBusy("");
    }
  }

  async function generate(problem = text) {
    setText(problem);
    setBusy("Building the lesson…");
    setErr("");
    const form = new FormData();
    form.set("text", problem);
    if (doc) form.set("file", doc);
    try {
      const r = await fetch("/api/tutor", { method: "POST", body: form });
      const body = await r.json().catch(() => ({ error: `Server error (${r.status}). Try again.` }));
      if (!r.ok) setErr(body.error);
      else {
        setOut(body);
        setOpen(true);
      }
    } catch {
      setErr("Couldn't reach the server.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <label className="label" htmlFor="problem">Problem</label>
        <textarea id="problem" className="input min-h-24 text-base" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={Boolean(busy) || (!text.trim() && !doc)} onClick={() => generate()}>
            <Sparkles size={16} /> Teach me
          </button>
          <label className="btn-ghost cursor-pointer">
            <Upload size={16} /> Upload file
            <input type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {doc && <span className="text-xs text-muted">{doc.name} <button className="underline" onClick={() => setDoc(null)}>remove</button></span>}
          {out && !open && <button className="btn-ghost" onClick={() => setOpen(true)}>Resume last lesson</button>}
          {busy && (
            <span className="flex items-center gap-2 text-sm">
              <Loader2 size={14} className="animate-spin" /> {busy} <Elapsed />
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="text-muted">Examples:</span>
          {PRESETS.map((p) => (
            <button key={p.label} className="chip rounded-full px-3 py-1" disabled={Boolean(busy)} onClick={() => generate(p.text)}>{p.label}</button>
          ))}
        </div>
        {warn && <p className="mt-2 text-sm text-amber-600">{warn}</p>}
      </Card>
      {err && <Card className="text-sm text-red-600">⚠ {err}</Card>}
      {out && <AiBadge ai={out} />}
      {out && open && <Player key={out.data.title + out.durationMs} lesson={out.data} onClose={() => setOpen(false)} onTry={(t) => (setOpen(false), generate(t))} />}
    </div>
  );
}

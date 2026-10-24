"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Elapsed } from "@/components/client";
import { AiBadge, Card } from "@/components/ui";
import { Player } from "@/components/tutor/player";
import { ocrImage } from "@/lib/ocr";
import { DEMO_TEXT } from "@/lib/tutor/demo";
import type { Lesson } from "@/lib/tutor/lesson";

type Out = { data: Lesson; cached: boolean; durationMs: number; model: string };

export function TutorTool() {
  const [text, setText] = useState(DEMO_TEXT);
  const [pdf, setPdf] = useState<File | null>(null);
  const [lang, setLang] = useState<"en" | "bn">("en");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [warn, setWarn] = useState("");
  const [out, setOut] = useState<Out | null>(null);

  async function onFile(file: File | undefined) {
    setWarn("");
    if (!file) return;
    if (file.type === "application/pdf") return setPdf(file);
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

  async function generate() {
    setBusy("Building the lesson…");
    setErr("");
    setOut(null);
    const form = new FormData();
    form.set("text", text);
    form.set("lang", lang);
    if (pdf) form.set("pdf", pdf);
    try {
      const r = await fetch("/api/tutor", { method: "POST", body: form });
      const body = await r.json().catch(() => ({ error: `Server error (${r.status}). Try again.` }));
      if (!r.ok) setErr(body.error);
      else setOut(body);
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
        <textarea id="problem" className="input min-h-20" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="btn-ghost cursor-pointer">
            Photo or PDF
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {pdf && <span className="text-xs text-muted">{pdf.name} <button className="underline" onClick={() => setPdf(null)}>remove</button></span>}
          <select className="input w-auto" value={lang} onChange={(e) => setLang(e.target.value as "en" | "bn")} aria-label="Language">
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
          <button className="btn-primary" disabled={Boolean(busy) || (!text.trim() && !pdf)} onClick={generate}>Teach me</button>
          {busy && (
            <span className="flex items-center gap-2 text-sm">
              <Loader2 size={14} className="animate-spin" /> {busy} <Elapsed />
            </span>
          )}
        </div>
        {warn && <p className="mt-2 text-sm text-amber-600">{warn}</p>}
      </Card>
      {err && <Card className="text-sm text-red-600">⚠ {err}</Card>}
      {out && (
        <>
          <AiBadge ai={out} />
          <Player key={out.data.title + out.durationMs} lesson={out.data} lang={lang} />
        </>
      )}
    </div>
  );
}

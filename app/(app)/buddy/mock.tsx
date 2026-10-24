"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Timer as TimerIcon } from "lucide-react";
import { Elapsed } from "@/components/client";
import { Card } from "@/components/ui";
import type { Mcq } from "@/lib/buddy/material";

type Result = { marks: boolean[]; score: number; total: number; topics: { topic: string; right: number; total: number }[] };
type Explained = { explanation: string; steps: string[] };

async function call<T>(body: object): Promise<T> {
  const r = await fetch("/api/buddy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
  if (!r.ok) throw new Error(j.error ?? "Request failed");
  return j as T;
}

/** Standalone mock quiz: pick course, length and timer, then run it as its own session. */
export function MockSetup({ courses, courseId: initial }: { courses: { id: string; label: string }[]; courseId: string }) {
  const [courseId, setCourseId] = useState(initial);
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [err, setErr] = useState("");

  if (sessionId) return <MockRunner sessionId={sessionId} count={count} minutes={minutes} />;
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label>
          <span className="label">Course</span>
          <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Questions</span>
          <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Timer</span>
          <select className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            <option value={0}>Off</option>
            <option value={10}>10 min</option>
            <option value={20}>20 min</option>
          </select>
        </label>
        <button className="btn-primary" onClick={() => call<{ id: string }>({ action: "start", mode: "mock", courseId }).then((s) => setSessionId(s.id), (e) => setErr(e.message))}>Start mock quiz</button>
      </div>
      <p className="mt-2 text-xs text-muted">Questions lean towards topics you&apos;ve missed before. Mistakes go into your log.</p>
      {err && <p className="mt-2 text-sm text-red-600">⚠ {err}</p>}
    </Card>
  );
}

/** One question at a time, optional countdown, graded on the server, then results by topic. */
export function MockRunner({ sessionId, count = 10, minutes = 0 }: { sessionId: string; count?: number; minutes?: number }) {
  const router = useRouter();
  const [qs, setQs] = useState<Mcq[] | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [at, setAt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [help, setHelp] = useState<Record<number, Explained | "loading">>({});

  useEffect(() => {
    call<{ data: { questions: Mcq[] } }>({ action: "mock", sessionId, count }).then(
      (r) => {
        setQs(r.data.questions);
        setAnswers(r.data.questions.map(() => null));
        if (minutes) setDeadline(Date.now() + minutes * 60000);
      },
      (e) => setErr(e.message),
    );
  }, [sessionId, count, minutes]);

  const submit = async (final = answers) => {
    if (!qs || busy || result) return;
    setBusy(true);
    try {
      setResult(await call<Result>({ action: "mockSubmit", sessionId, questions: qs, answers: final }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!deadline || result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline, result]);
  const left = deadline ? Math.max(0, Math.round((deadline - now) / 1000)) : null;
  useEffect(() => {
    if (left === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (err) return <Card className="text-sm text-red-600">⚠ {err}</Card>;
  if (!qs)
    return (
      <Card className="flex items-center gap-2 text-sm">
        <Loader2 size={14} className="animate-spin" /> Writing your mock quiz… <Elapsed />
      </Card>
    );

  if (result)
    return (
      <div className="grid gap-4">
        <Card>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-3xl font-semibold">{result.score}/{result.total}</h2>
            <span className="text-muted">{Math.round((100 * result.score) / result.total)}%</span>
            <button className="btn-ghost ml-auto" onClick={() => router.refresh()}>Done</button>
          </div>
          <div className="mt-4 grid gap-2">
            {result.topics.map((t) => (
              <div key={t.topic} className="text-sm">
                <div className="flex justify-between"><span>{t.topic}</span><span className="text-muted">{t.right}/{t.total}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-subtle">
                  <div className={`h-full ${t.right === t.total ? "bg-emerald-500" : t.right ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${(100 * t.right) / t.total}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        {qs.map((q, i) =>
          result.marks[i] ? null : (
            <Card key={i}>
              <p className="text-xs text-muted">{q.topic}</p>
              <p className="font-medium">{q.question}</p>
              <p className="mt-2 text-sm text-red-600">Your answer: {answers[i] === null ? "(none)" : q.options[answers[i]!]}</p>
              <p className="text-sm text-emerald-700">Correct: {q.options[q.answer]}</p>
              <p className="mt-2 text-sm text-muted">{q.explanation}</p>
              {help[i] === undefined && (
                <button
                  className="btn-ghost mt-2"
                  onClick={() => {
                    setHelp({ ...help, [i]: "loading" });
                    call<{ data: Explained }>({ action: "stuck", sessionId, question: `${q.question} Why is "${q.options[q.answer]}" correct and not "${answers[i] === null ? "my guess" : q.options[answers[i]!]}"?` }).then(
                      (r) => setHelp((h) => ({ ...h, [i]: r.data })),
                      () => setHelp((h) => { const n = { ...h }; delete n[i]; return n; }),
                    );
                  }}
                >
                  Explain this one
                </button>
              )}
              {help[i] === "loading" && <p className="mt-2 flex items-center gap-2 text-sm"><Loader2 size={14} className="animate-spin" /> Explaining…</p>}
              {help[i] && help[i] !== "loading" && (
                <div className="mt-3 rounded-xl bg-subtle p-3 text-sm">
                  <p>{(help[i] as Explained).explanation}</p>
                  <ol className="mt-2 list-decimal pl-5">{(help[i] as Explained).steps.map((s, k) => <li key={k}>{s}</li>)}</ol>
                </div>
              )}
            </Card>
          ),
        )}
      </div>
    );

  const q = qs[at];
  const answered = answers.filter((a) => a !== null).length;
  return (
    <Card>
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">Question {at + 1} / {qs.length}</span>
        <span className="text-muted">{q.topic}</span>
        {left !== null && (
          <span className={`ml-auto flex items-center gap-1 font-mono ${left < 60 ? "text-red-600" : "text-muted"}`}>
            <TimerIcon size={14} /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle"><div className="h-full bg-accent transition-all" style={{ width: `${(100 * answered) / qs.length}%` }} /></div>
      <p className="mt-5 text-lg font-medium">{q.question}</p>
      <div className="mt-4 grid gap-2">
        {q.options.map((o, j) => (
          <button
            key={j}
            onClick={() => {
              const next = answers.map((a, k) => (k === at ? j : a));
              setAnswers(next);
              if (at < qs.length - 1) setTimeout(() => setAt(at + 1), 250);
            }}
            className={`rounded-xl border px-4 py-3 text-left transition ${answers[at] === j ? "border-accent bg-accent/10" : "border-line hover:bg-subtle"}`}
          >
            <span className="mr-2 font-mono text-xs text-muted">{"ABCD"[j]}</span>
            {o}
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2">
        <button className="btn-ghost" disabled={at === 0} onClick={() => setAt(at - 1)} aria-label="Previous question"><ChevronLeft size={16} /></button>
        <button className="btn-ghost" disabled={at === qs.length - 1} onClick={() => setAt(at + 1)} aria-label="Next question"><ChevronRight size={16} /></button>
        <button className="btn-primary ml-auto" disabled={busy} onClick={() => submit()}>
          {busy && <Loader2 size={14} className="animate-spin" />} Submit ({answered}/{qs.length})
        </button>
      </div>
    </Card>
  );
}

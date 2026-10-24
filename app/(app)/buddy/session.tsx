"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Volume2, X } from "lucide-react";
import { Elapsed } from "@/components/client";
import { Quiz } from "@/components/quiz";
import { AiBadge, Card } from "@/components/ui";
import type { Goal, Report } from "@/lib/buddy/ai";
import type { Mcq } from "@/lib/buddy/material";
import { speak } from "@/lib/tutor/voice";

type Course = { id: string; label: string };
type Mistake = { kind: string; topic: string | null; detail: { question?: string } };
type Resume = { id: string; courseId: string; goals: Goal[]; startedAt: string; mistakes: Mistake[] };
type Ai<T> = { data: T; cached: boolean; durationMs: number; model: string; provider?: string };
type Explained = { explanation: string; steps: string[]; covered: boolean; topic: string; sources: string[]; check: Mcq };

async function call<T>(body: object): Promise<T> {
  const r = await fetch("/api/buddy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
  if (!r.ok) throw new Error(j.error ?? "Request failed");
  return j as T;
}

export function BuddySession({ courses, resume }: { courses: Course[]; resume: Resume | null }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(resume?.courseId ?? courses[0].id);
  const [sessionId, setSessionId] = useState(resume?.id ?? "");
  const [startedAt, setStartedAt] = useState(resume?.startedAt ?? "");
  const [goals, setGoals] = useState<Goal[]>(resume?.goals ?? []);
  const [mistakes, setMistakes] = useState<Mistake[]>(resume?.mistakes ?? []);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [stuckQ, setStuckQ] = useState("");
  const [help, setHelp] = useState<Ai<Explained> | null>(null);
  const [quiz, setQuiz] = useState<{ topic: string; questions: Mcq[] } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [mock, setMock] = useState<{ questions: Mcq[]; answers: (number | null)[]; result?: { marks: boolean[]; score: number; total: number } } | null>(null);
  const phase = report ? "wrap" : sessionId ? "study" : "plan";

  async function run<T>(label: string, fn: () => Promise<T>) {
    setBusy(label);
    setErr("");
    try {
      return await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const suggest = () => run("Planning today's goals…", async () => setGoals((await call<Ai<Goal[]>>({ action: "suggest", courseId })).data));
  const start = () =>
    run("Starting…", async () => {
      const s = await call<{ id: string; startedAt: string }>({ action: "start", courseId, goals });
      setSessionId(s.id);
      setStartedAt(s.startedAt);
    });
  const saveGoals = (next: Goal[]) => (setGoals(next), sessionId && run("", () => call({ action: "goals", sessionId, goals: next })));
  const answered = (topic: string, q: Mcq, chosen: number, correct: boolean) => {
    if (!correct) setMistakes((m) => [...m, { kind: "wrong", topic, detail: { question: q.question } }]);
    call({ action: "answer", sessionId, topic, correct, detail: { question: q.question, chosen, answer: q.answer } }).catch(() => {});
  };

  if (phase === "plan")
    return (
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-60 flex-1">
            <span className="label">Course</span>
            <select className="input" value={courseId} onChange={(e) => (setCourseId(e.target.value), setGoals([]))}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <button className="btn-primary" disabled={Boolean(busy)} onClick={suggest}>Plan today&apos;s goals</button>
        </div>
        {goals.length > 0 && (
          <div className="mt-4 grid gap-2">
            <span className="label">Today&apos;s goals (edit freely)</span>
            {goals.map((g, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" value={g.text} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} aria-label={`Goal ${i + 1}`} />
                <button className="btn-ghost" onClick={() => setGoals(goals.filter((_, j) => j !== i))} aria-label="Remove goal"><X size={16} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setGoals([...goals, { text: "", topic: goals[0]?.topic ?? "", done: false }])}><Plus size={16} /> Add goal</button>
              <button className="btn-primary" disabled={Boolean(busy)} onClick={start}>Start session</button>
            </div>
          </div>
        )}
        <Status busy={busy} err={err} />
      </Card>
    );

  if (phase === "wrap" && report)
    return (
      <div className="grid gap-4">
        <Card>
          <h2 className="text-lg font-semibold">Session report</h2>
          <div className="mt-1 text-sm text-muted">
            {report.minutes} min · goals {report.goalsDone}/{report.goalsTotal}
            {report.accuracy !== null && ` · ${report.accuracy}% correct`}
          </div>
          <p className="mt-3 text-sm">{report.summary}</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <List title="Went well" items={report.strengths} />
            <List title="Review next" items={[...report.weak.map((w) => `${w.topic} (${w.misses} miss${w.misses === 1 ? "" : "es"})`), ...report.review]} />
          </div>
          <p className="mt-3 text-sm"><b>Tomorrow:</b> {report.tomorrow}</p>
          <div className="mt-4 flex gap-2">
            {!mock && <button className="btn-primary" disabled={Boolean(busy)} onClick={() => run("Writing your mock exam…", async () => { const r = await call<Ai<{ questions: Mcq[] }>>({ action: "mock", sessionId }); setMock({ questions: r.data.questions, answers: r.data.questions.map(() => null) }); })}>Take a mock exam</button>}
            <button className="btn-ghost" onClick={() => router.refresh()}>Done</button>
          </div>
          <Status busy={busy} err={err} />
        </Card>
        {mock && (
          <Card>
            <h2 className="mb-3 font-semibold">Mock exam {mock.result && `· ${mock.result.score}/${mock.result.total}`}</h2>
            <ol className="list-decimal space-y-4 pl-5 text-sm">
              {mock.questions.map((q, i) => (
                <li key={i}>
                  <p className="font-medium">{q.question}</p>
                  <div className="mt-2 grid gap-1.5">
                    {q.options.map((o, j) => {
                      const chosen = mock.answers[i] === j;
                      const tone = mock.result ? (j === q.answer ? "border-emerald-500 bg-emerald-500/10" : chosen ? "border-red-500 bg-red-500/10" : "") : chosen ? "border-accent bg-accent/10" : "";
                      return (
                        <button key={j} disabled={Boolean(mock.result)} onClick={() => setMock({ ...mock, answers: mock.answers.map((a, k) => (k === i ? j : a)) })} className={`rounded-lg border border-line px-3 py-1.5 text-left ${tone}`}>{o}</button>
                      );
                    })}
                  </div>
                  {mock.result && <p className="mt-2 text-xs text-muted">{q.explanation}</p>}
                </li>
              ))}
            </ol>
            {!mock.result && (
              <button className="btn-primary mt-4" disabled={Boolean(busy)} onClick={() => run("Marking…", async () => setMock({ ...mock, result: await call({ action: "mockSubmit", sessionId, questions: mock.questions, answers: mock.answers }) }))}>
                Submit ({mock.answers.filter((a) => a !== null).length}/{mock.questions.length} answered)
              </button>
            )}
          </Card>
        )}
      </div>
    );

  const done = goals.filter((g) => g.done).length;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-4">
        <Card>
          <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), stuckQ.trim() && run("Thinking it through with you…", async () => { setHelp(null); const r = await call<Ai<Explained>>({ action: "stuck", sessionId, question: stuckQ }); setHelp(r); setMistakes((m) => [...m, { kind: "stuck", topic: r.data.topic, detail: { question: stuckQ } }]); }))}>
            <input className="input" value={stuckQ} onChange={(e) => setStuckQ(e.target.value)} placeholder="I'm stuck on… (e.g. why does quicksort degrade to O(n²)?)" aria-label="What are you stuck on" />
            <button className="btn-primary" disabled={Boolean(busy)}>Help me</button>
          </form>
          <Status busy={busy} err={err} />
        </Card>
        {help && (
          <Card>
            <div className="mb-2 flex items-center justify-between gap-2">
              <AiBadge ai={help} />
              <button className="btn-ghost" onClick={() => speak(`${help.data.explanation} ${help.data.steps.join(" ")}`, "en")} aria-label="Read explanation aloud"><Volume2 size={16} /></button>
            </div>
            {!help.data.covered && <p className="mb-2 text-sm text-amber-600">Your lecture notes don&apos;t fully cover this.</p>}
            <p className="text-sm">{help.data.explanation}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{help.data.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            {help.data.sources.length > 0 && <p className="mt-2 text-xs text-muted">Sources: {help.data.sources.join(", ")}</p>}
            <h3 className="mb-2 mt-4 text-sm font-semibold">Check yourself</h3>
            <Quiz key={help.data.check.question} questions={[help.data.check]} onAnswer={(q, c, ok) => answered(help.data.topic, q, c, ok)} />
          </Card>
        )}
        {quiz && (
          <Card>
            <h3 className="mb-3 font-semibold">Quiz · {quiz.topic}</h3>
            <Quiz key={quiz.topic + quiz.questions[0]?.question} questions={quiz.questions} onAnswer={(q, c, ok) => answered(quiz.topic, q, c, ok)} />
          </Card>
        )}
      </div>
      <div className="grid content-start gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Today&apos;s goals</h2>
            <Timer since={startedAt} />
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={done} aria-valuemax={goals.length}>
            <div className="h-full bg-accent transition-all" style={{ width: `${(100 * done) / Math.max(1, goals.length)}%` }} />
          </div>
          <ul className="mt-3 grid gap-2 text-sm">
            {goals.map((g, i) => (
              <li key={i} className="flex items-start gap-2">
                <button onClick={() => saveGoals(goals.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${g.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line"}`} aria-label={g.done ? "Mark not done" : "Mark done"}>
                  {g.done && <Check size={14} />}
                </button>
                <span className={`flex-1 ${g.done ? "text-muted line-through" : ""}`}>{g.text}</span>
                {g.topic && <button className="text-xs text-accent hover:underline" disabled={Boolean(busy)} onClick={() => run("Writing a quiz…", async () => setQuiz({ topic: g.topic, questions: (await call<Ai<{ questions: Mcq[] }>>({ action: "quiz", sessionId, topic: g.topic })).data.questions }))}>Quiz me</button>}
              </li>
            ))}
          </ul>
          <button className="btn-primary mt-4 w-full" disabled={Boolean(busy)} onClick={() => run("Writing your report…", async () => setReport((await call<Ai<Report>>({ action: "end", sessionId })).data))}>End session &amp; get report</button>
        </Card>
        <Card>
          <h2 className="font-semibold">Mistake log</h2>
          {mistakes.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing yet. Wrong answers and things you got stuck on show up here.</p>
          ) : (
            <ul className="mt-2 grid gap-2 text-sm">
              {mistakes.map((m, i) => (
                <li key={i}>
                  <span className={`mr-1 rounded px-1.5 text-xs ${m.kind === "stuck" ? "bg-amber-500/15 text-amber-700" : "bg-red-500/15 text-red-700"}`}>{m.kind}</span>
                  {m.topic && <span className="text-xs text-muted">{m.topic} · </span>}
                  {m.detail.question}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Timer({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  return <span className="font-mono text-sm text-muted">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}

function Status({ busy, err }: { busy: string; err: string }) {
  return (
    <>
      {busy && <div className="mt-3 flex items-center gap-2 text-sm"><Loader2 size={14} className="animate-spin" /> {busy} <Elapsed /></div>}
      {err && <p className="mt-3 text-sm text-red-600">⚠ {err}</p>}
    </>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-1 list-disc pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

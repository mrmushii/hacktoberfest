"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { saveProfile } from "@/app/actions";
import { Avatar } from "@/components/profile-menu";
import { CoursesStep, DepartmentStep, NameStep, PreferencesStep, SemesterStep, UniversityStep, stepError, type CourseOpt, type Draft } from "@/components/profile-steps";

const STEPS = [
  { id: "name", label: "Name", title: "What should we call you?", sub: "This appears on your dashboard and cover pages." },
  { id: "university", label: "University", title: "Where do you study?", sub: "Your student ID pre-fills cover pages." },
  { id: "department", label: "Department", title: "Your department", sub: "We'll show notices and courses for this department." },
  { id: "semester", label: "Batch", title: "Semester & section", sub: "Notices are targeted by batch — this keeps yours relevant." },
  { id: "courses", label: "Courses", title: "Your courses", sub: "We pre-selected courses for your semester. Adjust as needed." },
  { id: "preferences", label: "Preferences", title: "Preferences", sub: "Change these any time in Settings." },
  { id: "done", label: "Review", title: "You're all set", sub: "Here's your profile." },
] as const;

const KEY = "unihub.onboarding";

export function Wizard({ initial, image, email, departments, courses }: { initial: Draft; image: string | null; email: string; departments: string[]; courses: CourseOpt[] }) {
  const [d, setD] = useState<Draft>(initial);
  const [i, setI] = useState(0);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const [dir, setDir] = useState(1);
  const card = useRef<HTMLFormElement>(null);
  const go = (delta: number) => (setErr(""), setDir(delta), setI((x) => x + delta));

  // Focus the step's first field without letting the browser scroll it into view mid-animation.
  useEffect(() => {
    card.current?.querySelector<HTMLElement>("input, button[aria-pressed]")?.focus({ preventScroll: true });
  }, [i]);

  // Keep the draft across refreshes.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      if (saved?.email === email) {
        setD(saved.d);
        setI(saved.i);
      }
    } catch {}
  }, [email]);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ email, d, i }));
    } catch {}
  }, [email, d, i]);

  const set = (p: Partial<Draft>) => (setErr(""), setD((x) => ({ ...x, ...p })));
  const step = STEPS[i];
  const blocker = stepError(step.id, d);
  const next = () => {
    if (blocker) return setErr(blocker);
    if (step.id !== "done") return go(1);
    start(async () => {
      const r = await saveProfile(d, true); // redirects on success
      if (r && !r.ok) setErr(r.error);
      else
        try {
          sessionStorage.removeItem(KEY);
        } catch {}
    });
  };
  const chosen = courses.filter((c) => d.courseIds.includes(c.id));

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between text-xs text-muted">
          <span>
            Step {i + 1} of {STEPS.length} · <span className="font-medium text-ink">{step.label}</span>
          </span>
          <span>{email}</span>
        </div>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* One step at a time; re-keyed so it slides in from the direction of travel. */}
        <form
          key={step.id}
          ref={card}
          onSubmit={(e) => (e.preventDefault(), next())}
          className={`rounded-2xl border border-line bg-panel p-6 shadow-xl sm:p-8 ${dir > 0 ? "animate-step-in" : "animate-step-back"}`}
        >
          {step.id === "name" && (
            <div className="mb-5">
              <Avatar name={d.name} image={image} size={56} />
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight">{step.title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{step.sub}</p>
          {step.id === "name" && <NameStep d={d} set={set} />}
          {step.id === "university" && <UniversityStep d={d} set={set} />}
          {step.id === "department" && <DepartmentStep d={d} set={set} departments={departments} />}
          {step.id === "semester" && <SemesterStep d={d} set={set} />}
          {step.id === "courses" && <CoursesStep d={d} set={set} courses={courses} />}
          {step.id === "preferences" && <PreferencesStep d={d} set={set} />}
          {step.id === "done" && (
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-subtle p-4 text-sm">
              {[
                ["Name", d.name],
                ["University", d.university],
                ["Department", d.department],
                ["Batch", `Semester ${d.semester} · Section ${d.section}`],
                ["Courses", chosen.map((c) => c.code).join(", ") || "None yet"],
                ["Alerts", d.notifyTypes.join(", ")],
              ].map(([k2, v]) => (
                <div key={k2}>
                  <dt className="text-xs text-muted">{k2}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {err && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div className="mt-8 flex items-center justify-between">
            <button type="button" onClick={() => go(-1)} disabled={i === 0} className="btn-ghost disabled:invisible">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex gap-2">
              {step.id === "courses" && d.courseIds.length === 0 && (
                <button type="button" className="btn-ghost" onClick={() => go(1)}>
                  Skip
                </button>
              )}
              <button className="btn-primary" disabled={pending}>
                {step.id === "done" ? (
                  <>
                    {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Go to my dashboard
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

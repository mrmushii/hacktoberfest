"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveProfile } from "@/app/actions";
import { CoursesStep, DepartmentStep, NameStep, PreferencesStep, SemesterStep, UniversityStep, stepError, type CourseOpt, type Draft } from "./profile-steps";

const SECTIONS = {
  profile: [
    ["name", "Name"],
    ["university", "University"],
    ["department", "Department"],
    ["semester", "Batch"],
    ["courses", "Courses"],
  ],
  settings: [["preferences", "Language, alerts & theme"]],
} as const;

/** Profile and Settings pages: the onboarding steps, stacked, with one Save. */
export function ProfileEditor({ initial, departments, courses, mode }: { initial: Draft; departments: string[]; courses: CourseOpt[]; mode: keyof typeof SECTIONS }) {
  const [d, setD] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (p: Partial<Draft>) => (setMsg(null), setD((x) => ({ ...x, ...p })));
  const save = () => {
    const bad = SECTIONS[mode].map(([id]) => stepError(id, d)).find(Boolean);
    if (bad) return setMsg({ ok: false, text: bad });
    start(async () => {
      const r = await saveProfile(d, false);
      setMsg(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: r.error });
    });
  };
  return (
    <div className="grid max-w-2xl gap-4">
      {SECTIONS[mode].map(([id, title]) => (
        <section key={id} className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-4 font-medium">{title}</h2>
          {id === "name" && <NameStep d={d} set={set} />}
          {id === "university" && <UniversityStep d={d} set={set} />}
          {id === "department" && <DepartmentStep d={d} set={set} departments={departments} />}
          {id === "semester" && <SemesterStep d={d} set={set} />}
          {id === "courses" && <CoursesStep d={d} set={set} courses={courses} />}
          {id === "preferences" && <PreferencesStep d={d} set={set} />}
        </section>
      ))}
      <div className="sticky bottom-4 flex items-center gap-3">
        <button className="btn-primary shadow-lg" onClick={save} disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save changes
        </button>
        {msg && (
          <span role="status" className={`rounded-lg px-3 py-1.5 text-sm shadow ${msg.ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EVENT_TYPES } from "@/lib/notices/schema";
import { PRESET_DEPARTMENTS, SECTIONS } from "@/lib/onboarding";

export type Draft = {
  name: string;
  university: string;
  studentId: string;
  department: string;
  semester: number | null;
  section: string;
  courseIds: string[];
  language: "en" | "bn";
  notifyTypes: string[];
  theme: "system" | "light" | "dark";
};
export type CourseOpt = { id: string; code: string; title: string; department: string; semester: number };
type P = { d: Draft; set: (p: Partial<Draft>) => void };

const Chips = <T extends string | number>({ options, value, onPick, label = (v: T) => String(v) }: { options: readonly T[]; value: T | T[] | null; onPick: (v: T) => void; label?: (v: T) => string }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = Array.isArray(value) ? value.includes(o) : value === o;
      return (
        <button type="button" key={String(o)} aria-pressed={on} onClick={() => onPick(o)} className={`chip min-w-12 ${on ? "chip-on" : ""}`}>
          {label(o)}
        </button>
      );
    })}
  </div>
);

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
  </label>
);

export function NameStep({ d, set }: P) {
  return (
    <Field label="Full name">
      <input className="input py-3 text-base" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ayesha Rahman" />
    </Field>
  );
}

export function UniversityStep({ d, set }: P) {
  return (
    <div className="grid gap-4">
      <Field label="University">
        <input className="input py-3 text-base" value={d.university} onChange={(e) => set({ university: e.target.value })} placeholder="e.g. University of Dhaka" />
      </Field>
      <Field label="Student ID (optional)">
        <input className="input py-3 text-base" value={d.studentId} onChange={(e) => set({ studentId: e.target.value })} placeholder="e.g. 2021-1-60-045" />
      </Field>
    </div>
  );
}

export function DepartmentStep({ d, set, departments }: P & { departments: string[] }) {
  const all = [...new Set([...departments, ...PRESET_DEPARTMENTS])];
  const custom = d.department && !all.includes(d.department);
  return (
    <div className="grid gap-4">
      <Chips options={all} value={d.department} onPick={(v) => set({ department: v, courseIds: [] })} />
      <Field label="Not listed? Type your department code">
        <input className={`input ${custom ? "border-accent" : ""}`} value={custom ? d.department : ""} onChange={(e) => set({ department: e.target.value.toUpperCase(), courseIds: [] })} placeholder="e.g. ARCH" />
      </Field>
    </div>
  );
}

export function SemesterStep({ d, set }: P) {
  return (
    <div className="grid gap-5">
      <div>
        <span className="label">Semester</span>
        <Chips options={[1, 2, 3, 4, 5, 6, 7, 8]} value={d.semester} onPick={(v) => set({ semester: v, courseIds: [] })} />
      </div>
      <div>
        <span className="label">Section</span>
        <Chips options={SECTIONS} value={d.section} onPick={(v) => set({ section: v })} />
      </div>
    </div>
  );
}

export function CoursesStep({ d, set, courses }: P & { courses: CourseOpt[] }) {
  const [q, setQ] = useState("");
  const mine = (c: CourseOpt) => c.department === d.department && c.semester === d.semester;
  const list = useMemo(
    () =>
      courses
        .filter((c) => (q ? `${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase()) : mine(c) || d.courseIds.includes(c.id)))
        .sort((a, b) => Number(mine(b)) - Number(mine(a)) || a.code.localeCompare(b.code)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courses, q, d.department, d.semester, d.courseIds],
  );
  const toggle = (id: string) => set({ courseIds: d.courseIds.includes(id) ? d.courseIds.filter((x) => x !== id) : [...d.courseIds, id] });
  return (
    <div className="grid gap-3">
      <label className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all courses to add more" />
      </label>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted">{q ? "No courses match." : `No ${d.department} semester ${d.semester} courses yet. Search to add others, or skip.`}</p>}
        {list.map((c) => {
          const on = d.courseIds.includes(c.id);
          return (
            <button type="button" key={c.id} onClick={() => toggle(c.id)} aria-pressed={on} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${on ? "border-accent bg-accent/5" : "border-line hover:border-accent/50"}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${on ? "border-accent bg-accent text-white dark:text-black" : "border-line"}`}>{on && "✓"}</span>
              <span className="flex-1">
                <span className="font-medium">{c.code}</span> · {c.title}
              </span>
              {!mine(c) && <span className="text-xs text-muted">{c.department}-{c.semester}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PreferencesStep({ d, set }: P) {
  return (
    <div className="grid gap-5">
      <div>
        <span className="label">Language</span>
        <Chips options={["en", "bn"] as const} value={d.language} onPick={(v) => set({ language: v })} label={(v) => (v === "en" ? "English" : "বাংলা")} />
      </div>
      <div>
        <span className="label">Alert me about</span>
        <Chips
          options={EVENT_TYPES}
          value={d.notifyTypes}
          label={(v) => v[0].toUpperCase() + v.slice(1)}
          onPick={(v) => set({ notifyTypes: d.notifyTypes.includes(v) ? d.notifyTypes.filter((x) => x !== v) : [...d.notifyTypes, v] })}
        />
      </div>
      <div>
        <span className="label">Theme</span>
        <Chips options={["system", "light", "dark"] as const} value={d.theme} onPick={(v) => set({ theme: v })} label={(v) => v[0].toUpperCase() + v.slice(1)} />
      </div>
    </div>
  );
}

/** Client-side check per step so Next is only enabled when the step is complete. */
export function stepError(step: string, d: Draft): string | null {
  if (step === "name" && d.name.trim().length < 2) return "Enter your name";
  if (step === "university" && d.university.trim().length < 2) return "Enter your university";
  if (step === "department" && !/^[A-Z]{2,6}$/.test(d.department)) return "Pick or type your department";
  if (step === "semester" && (!d.semester || !d.section)) return "Pick your semester and section";
  if (step === "preferences" && d.notifyTypes.length === 0) return "Pick at least one notice type";
  return null;
}

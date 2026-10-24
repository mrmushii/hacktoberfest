"use client";

import { useState } from "react";
import { PageTitle } from "@/components/ui";

const TEMPLATES = ["Classic", "Modern", "Minimal"] as const;

export function CoverPage({ student, section, courses }: { student: string; section: string; courses: string[] }) {
  const [t, setT] = useState<(typeof TEMPLATES)[number]>("Classic");
  const [v, setV] = useState({
    university: "University of Dhaka",
    kind: "Assignment",
    title: "",
    course: courses[0] ?? "",
    teacher: "",
    student,
    id: "",
    section,
    date: new Date().toISOString().slice(0, 10),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const fields: [keyof typeof v, string][] = [
    ["university", "University"],
    ["kind", "Document type"],
    ["title", "Title"],
    ["teacher", "Submitted to"],
    ["student", "Student name"],
    ["id", "Student ID"],
    ["section", "Section"],
    ["date", "Submission date"],
  ];

  return (
    <>
      <div className="no-print">
        <PageTitle title="Cover Page Designer" sub="Fill in the details, preview live, then Save as PDF from the print dialog." action={<button className="btn-primary" onClick={() => window.print()}>Export PDF</button>} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="no-print grid content-start gap-3">
          <div className="flex gap-1">
            {TEMPLATES.map((x) => (
              <button key={x} onClick={() => setT(x)} className={x === t ? "btn-primary py-1.5" : "btn-ghost py-1.5"}>
                {x}
              </button>
            ))}
          </div>
          <label>
            <span className="label">Course</span>
            <select className="input" value={v.course} onChange={set("course")}>
              {courses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {fields.map(([k, label]) => (
            <label key={k}>
              <span className="label">{label}</span>
              <input className="input" type={k === "date" ? "date" : "text"} value={v[k]} onChange={set(k)} />
            </label>
          ))}
        </div>
        <div className="cover mx-auto aspect-[1/1.414] w-full max-w-[595px] bg-white p-[8%] text-black shadow-lg print:max-w-none print:shadow-none">
          <div className={`flex h-full flex-col ${t === "Classic" ? "border-4 border-double border-black p-[6%] text-center" : t === "Modern" ? "border-l-8 border-[#2f5bd3] pl-[8%]" : ""}`}>
            <div className={`text-2xl font-bold ${t === "Modern" ? "text-[#2f5bd3]" : ""}`}>{v.university}</div>
            <div className="mt-2 text-sm uppercase tracking-[0.2em] text-neutral-600">{v.course}</div>
            <div className="my-auto">
              <div className="text-sm uppercase tracking-widest text-neutral-500">{v.kind}</div>
              <div className="mt-3 text-3xl font-semibold leading-tight">{v.title || "Untitled"}</div>
            </div>
            <div className={`grid gap-6 text-sm ${t === "Classic" ? "grid-cols-2 text-left" : "grid-cols-2"}`}>
              <div>
                <div className="mb-1 font-semibold">Submitted to</div>
                <div>{v.teacher || "—"}</div>
              </div>
              <div>
                <div className="mb-1 font-semibold">Submitted by</div>
                <div>{v.student}</div>
                {v.id && <div>ID: {v.id}</div>}
                <div>Section: {v.section}</div>
              </div>
            </div>
            <div className="mt-6 text-sm text-neutral-600">Date of submission: {v.date && new Date(v.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
        </div>
      </div>
      <style>{`@media print { @page { size: A4; margin: 0 } main { padding: 0 !important } .cover { width: 210mm; height: 297mm; max-width: none } }`}</style>
    </>
  );
}

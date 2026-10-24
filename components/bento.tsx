"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { CATEGORIES, TOOLS, filterTools, type Category } from "@/lib/tools";
import { TOOL_ICONS } from "./nav";

export type TileData = { stat?: string; lines: string[] };

const SPAN = { lg: "sm:col-span-2 sm:row-span-2", md: "sm:col-span-2", sm: "" };

export function Bento({ greeting, sub, live, courses, coursesLabel }: { greeting: string; sub: string; live: Record<string, TileData>; courses: { code: string; title: string; docs: number }[]; coursesLabel: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const tools = useMemo(() => filterTools(TOOLS, q, cat), [q, cat]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-muted">{sub}</p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools…" aria-label="Search tools" className="input pl-9" />
        </label>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter tools">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`chip shrink-0 py-1.5 ${cat === c ? "chip-on" : ""}`}>
            {c}
          </button>
        ))}
      </div>

      {tools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
          No tools match “{q}”.{" "}
          <button className="text-accent" onClick={() => (setQ(""), setCat("All"))}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => {
            const Icon = TOOL_ICONS[t.id];
            const data = live[t.id];
            const body = (
              <>
                <div className="flex items-start justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.href ? "bg-accent/10 text-accent" : "bg-subtle text-muted"}`}>
                    <Icon size={20} />
                  </span>
                  {t.href ? (
                    <ArrowUpRight size={18} className="text-muted opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
                  ) : (
                    <span className="rounded-md bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted">Coming soon</span>
                  )}
                </div>
                <div className="mt-auto pt-6">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted">{t.category}</div>
                  <div className={`mt-1 font-semibold ${t.size === "lg" ? "text-xl" : ""}`}>{t.title}</div>
                  <p className="mt-1 text-sm text-muted">{t.description}</p>
                  {data && (
                    <div className={`mt-4 rounded-xl bg-subtle/70 p-3 text-sm ${t.size === "sm" ? "hidden" : ""}`}>
                      {data.stat && <div className="mb-1 font-semibold text-accent">{data.stat}</div>}
                      {data.lines.map((l, i) => (
                        <div key={i} className="truncate">
                          {l}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
            const cls = `group flex flex-col rounded-2xl border border-line bg-panel p-5 ${SPAN[t.size]}`;
            return t.href ? (
              <Link key={t.id} href={t.href} className={`${cls} transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
                {body}
              </Link>
            ) : (
              <div key={t.id} className={`${cls} opacity-60`} aria-disabled>
                {body}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 font-medium">{coursesLabel}</h2>
      {courses.length === 0 ? (
        <p className="text-sm text-muted">
          No courses yet. <Link href="/profile" className="text-accent">Add courses in your profile</Link>.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.code} className="rounded-xl border border-line bg-panel p-4">
              <div className="text-xs text-muted">{c.code}</div>
              <div className="font-medium">{c.title}</div>
              <div className="mt-3 flex gap-3 text-xs">
                <Link href={`/examgraph/${c.code}`} className="text-accent">ExamGraph</Link>
                <Link href={`/study?course=${c.code}`} className="text-accent">Study</Link>
                <span className="text-muted">{c.docs} docs</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

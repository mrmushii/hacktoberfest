"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Play, Search } from "lucide-react";
import { CATEGORIES, TOOLS, filterTools, type Category, type Tool } from "@/lib/tools";
import { TOOL_ICONS, ToolPreview } from "./tool-preview";

export type TileData = { stat?: string; lines: string[] };

const SPAN = { lg: "sm:col-span-2 sm:row-span-2", md: "sm:col-span-2", sm: "" };

export function Bento({ greeting, sub, live, courses, coursesLabel }: { greeting: string; sub: string; live: Record<string, TileData>; courses: { code: string; title: string; docs: number }[]; coursesLabel: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const tools = useMemo(() => filterTools(TOOLS, q, cat), [q, cat]);
  const [preview, setPreview] = useState<{ tool: Tool; play: boolean } | null>(null);

  return (
    <>
      <div className="mb-10">
        <p className="text-sm font-medium text-muted">{sub}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tighter sm:text-6xl">{greeting}</h1>
        <label className="relative mt-8 block max-w-xl">
          <Search size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools…" aria-label="Search tools" className="input rounded-full py-3.5 pl-12 text-base shadow-sm" />
        </label>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter tools">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`chip shrink-0 rounded-full px-4 py-1.5 ${cat === c ? "chip-on" : ""}`}>
            {c}
          </button>
        ))}
      </div>

      {tools.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-10 text-center text-sm text-muted">
          No tools match “{q}”.{" "}
          <button className="text-accent" onClick={() => (setQ(""), setCat("All"))}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="tiles grid auto-rows-[minmax(190px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => {
            const Icon = TOOL_ICONS[t.id];
            const data = live[t.id];
            return (
              <div key={t.id} className={`tile group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-panel p-6 ${SPAN[t.size]} ${t.size === "lg" ? "tile-glow" : ""}`}>
                {/* whole tile opens the preview; the arrow goes straight to the tool */}
                <button onClick={() => setPreview({ tool: t, play: false })} aria-label={`Preview ${t.title}`} className="absolute inset-0 rounded-3xl focus-visible:outline-none" />
                <div className="pointer-events-none relative flex items-start justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-110 ${t.href ? "bg-accent/10 text-accent" : "bg-subtle text-muted"}`}>
                    <Icon size={20} />
                  </span>
                  {t.href ? (
                    <Link href={t.href} aria-label={`Open ${t.title}`} className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:border-ink hover:bg-ink hover:text-bg focus-visible:bg-ink focus-visible:text-bg">
                      <ArrowUpRight size={16} />
                    </Link>
                  ) : (
                    <span className="rounded-full bg-subtle px-2.5 py-1 text-[11px] font-medium text-muted">Coming soon</span>
                  )}
                </div>

                {/* two layers in one cell: the summary, and on hover/focus what it does + how */}
                <div className="pointer-events-none relative mt-auto grid pt-6">
                  <div className={`tile-face col-start-1 row-start-1 ${t.href ? "" : "opacity-60"}`}>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted">{t.category}</div>
                    <div className={`mt-1 font-semibold tracking-tight ${t.size === "lg" ? "text-2xl sm:text-3xl" : "text-lg"}`}>{t.title}</div>
                    <p className="mt-1 text-sm text-muted">{t.description}</p>
                    {data && (
                      <div className={`mt-5 rounded-2xl bg-subtle/70 p-4 text-sm ${t.size === "sm" ? "hidden" : ""}`}>
                        {data.stat && <div className="mb-1 font-semibold text-accent">{data.stat}</div>}
                        {data.lines.map((l, i) => (
                          <div key={i} className="truncate">
                            {l}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="tile-more col-start-1 row-start-1 self-end" aria-hidden>
                    <div className={`font-semibold tracking-tight ${t.size === "lg" ? "text-2xl" : "text-base"}`}>{t.title}</div>
                    <p className={`mt-1 ${t.size === "sm" ? "text-sm" : "text-base"}`}>{t.purpose}</p>
                    {t.size !== "sm" && (
                      <ol className="mt-4 grid gap-2 text-sm text-muted">
                        {t.steps.map((step, i) => (
                          <li key={i} className="flex gap-2" style={{ transitionDelay: `${60 + i * 40}ms` }}>
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-subtle text-[11px] font-semibold text-ink">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}
                    {t.demo ? (
                      <button tabIndex={-1} onClick={() => setPreview({ tool: t, play: true })} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-bg transition hover:opacity-85">
                        <Play size={12} /> Watch demo
                      </button>
                    ) : (
                      <span className="mt-4 inline-flex rounded-full border border-line px-3.5 py-1.5 text-xs font-medium">Preview</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToolPreview tool={preview?.tool ?? null} autoplay={preview?.play} onClose={() => setPreview(null)} />

      <h2 className="mb-4 mt-16 text-2xl font-semibold tracking-tight">{coursesLabel}</h2>
      {courses.length === 0 ? (
        <p className="text-sm text-muted">
          No courses yet. <Link href="/profile" className="text-accent">Add courses in your profile</Link>.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.code} className="rounded-3xl border border-line bg-panel p-5 transition hover:shadow-lg">
              <div className="text-xs text-muted">{c.code}</div>
              <div className="font-medium">{c.title}</div>
              <div className="mt-4 flex items-center gap-2 text-xs">
                <Link href={`/examgraph/${c.code}`} className="rounded-full border border-line px-3 py-1.5 font-medium hover:bg-subtle">ExamGraph</Link>
                <Link href={`/study?course=${c.code}`} className="rounded-full border border-line px-3 py-1.5 font-medium hover:bg-subtle">Study</Link>
                <span className="ml-auto text-muted">{c.docs} docs</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

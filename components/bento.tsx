"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Bell, CalendarClock, Flame, Play, Plus, Search, Target } from "lucide-react";
import { CATEGORIES, TOOLS, filterTools, type Category, type Tool } from "@/lib/tools";
import { TOOL_ICONS, ToolPreview } from "./tool-preview";

export type TileData = { stat?: string; lines: string[] };

// Compact grid: tools come after "what to do now".
const SPAN = { lg: "sm:col-span-2", md: "sm:col-span-2", sm: "" };

type Today = { open: { code: string; done: number; total: number } | null; streak: number; minutesWeek: number; weak: string | null };
type Next = { tasks: { title: string; due: string }[]; unread: number; change: string | null };

export function Bento({ greeting, sub, live, courses, coursesLabel, today, next }: { greeting: string; sub: string; live: Record<string, TileData>; courses: { code: string; title: string; docs: number; weak: string | null }[]; coursesLabel: string; today: Today; next: Next }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const tools = useMemo(() => filterTools(TOOLS, q, cat), [q, cat]);
  const [preview, setPreview] = useState<{ tool: Tool; play: boolean } | null>(null);

  return (
    <>
      <div className="mb-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="tile-glow rounded-3xl border border-line bg-panel p-6 sm:p-8">
          <p className="text-sm font-medium text-muted">{sub}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tighter sm:text-5xl">{greeting}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {today.open ? (
              <Link href="/buddy" className="btn-primary">
                <Target size={16} /> Continue {today.open.code} session · {today.open.done}/{today.open.total} goals
              </Link>
            ) : (
              <Link href="/buddy" className="btn-primary">
                <Target size={16} /> Start today&apos;s study session
              </Link>
            )}
            <Link href="/buddy" className="btn-ghost">Mock quiz</Link>
            <Link href="/tutor" className="btn-ghost">Visual Tutor</Link>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-subtle/70 p-3">
              <div className="flex items-center gap-1 text-xs text-muted"><Flame size={14} /> Streak</div>
              <div className="mt-1 text-xl font-semibold">{today.streak}d</div>
            </div>
            <div className="rounded-2xl bg-subtle/70 p-3">
              <div className="text-xs text-muted">This week</div>
              <div className="mt-1 text-xl font-semibold">{today.minutesWeek}m</div>
            </div>
            <div className="min-w-0 rounded-2xl bg-subtle/70 p-3">
              <div className="text-xs text-muted">Needs work</div>
              <div className="mt-1 truncate font-semibold" title={today.weak ?? ""}>{today.weak ?? "—"}</div>
            </div>
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-3xl border border-line bg-panel p-6">
          <h2 className="font-semibold">Next up</h2>
          {next.tasks.length === 0 ? (
            <p className="text-sm text-muted">Nothing due. <Link href="/planner" className="text-accent">Add a task</Link></p>
          ) : (
            next.tasks.map((t, i) => (
              <Link key={i} href="/planner" className="flex items-center gap-2 text-sm hover:text-accent">
                <CalendarClock size={14} className="shrink-0 text-muted" />
                <span className="flex-1 truncate">{t.title}</span>
                <span className="shrink-0 text-xs text-muted">{t.due}</span>
              </Link>
            ))
          )}
          <Link href="/notices" className="mt-2 flex items-start gap-2 rounded-2xl bg-subtle/70 p-3 text-sm hover:bg-subtle">
            <Bell size={14} className="mt-0.5 shrink-0 text-muted" />
            <span className="min-w-0">
              <span className="font-medium">{next.unread ? `${next.unread} unread notice${next.unread > 1 ? "s" : ""}` : "Notices: all caught up"}</span>
              {next.change && <span className="block truncate text-xs text-muted">{next.change}</span>}
            </span>
          </Link>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{coursesLabel}</h2>
        <Link href="/courses" className="text-sm text-accent">Manage</Link>
      </div>
      <div className="mb-10 flex snap-x gap-3 overflow-x-auto pb-2">
        {courses.map((c) => (
          <Link key={c.code} href={`/courses/${c.code}`} className="w-60 shrink-0 snap-start rounded-3xl border border-line bg-panel p-5 transition hover:border-accent">
            <div className="text-xs text-muted">{c.code}</div>
            <div className="truncate font-medium">{c.title}</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted">{c.docs} files</span>
              {c.weak && <span className="ml-auto truncate rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700" title={`Needs work: ${c.weak}`}>{c.weak}</span>}
            </div>
          </Link>
        ))}
        <Link href="/courses" className="grid w-48 shrink-0 snap-start place-items-center rounded-3xl border border-dashed border-line p-5 text-sm text-muted hover:border-accent hover:text-accent">
          <span className="flex items-center gap-1"><Plus size={16} /> Add course</span>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-xl font-semibold tracking-tight">Tools</h2>
        <label className="relative block w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools…" aria-label="Search tools" className="input rounded-full py-2 pl-10" />
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
        <div className="tiles grid auto-rows-[minmax(170px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => {
            const Icon = TOOL_ICONS[t.id];
            const data = live[t.id];
            return (
              <div key={t.id} className={`tile group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-panel p-6 ${SPAN[t.size]} `}>
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
                    <div className={`mt-1 font-semibold tracking-tight text-lg`}>{t.title}</div>
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
                    <div className={`font-semibold tracking-tight text-base`}>{t.title}</div>
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

    </>
  );
}

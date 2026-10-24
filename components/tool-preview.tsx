"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, FileText, Megaphone, Network, PenLine, Play, Presentation, X, type LucideIcon } from "lucide-react";
import type { Tool } from "@/lib/tools";

export const TOOL_ICONS: Record<string, LucideIcon> = {
  notices: Megaphone,
  examgraph: Network,
  study: BookOpen,
  planner: CalendarDays,
  cover: FileText,
  assignment: PenLine,
  slides: Presentation,
};

/** What a tool is for, how it works, and its recorded demo. Driven entirely by the Tool entry. */
export function ToolPreview({ tool, autoplay = false, onClose }: { tool: Tool | null; autoplay?: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(autoplay);
    if (tool) ref.current?.showModal();
    else ref.current?.close();
  }, [tool, autoplay]);

  const Icon = tool ? TOOL_ICONS[tool.id] : null;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="preview m-auto w-[min(1040px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none border border-line bg-panel p-0 text-ink shadow-2xl"
    >
      {tool && Icon && (
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <div className="flex flex-col">
            <div className="flex items-start gap-4">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tool.href ? "bg-accent/10 text-accent" : "bg-subtle text-muted"}`}>
                <Icon size={26} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium uppercase tracking-wide text-muted">{tool.category}</div>
                <h2 className="text-3xl font-semibold tracking-tight">{tool.title}</h2>
              </div>
              <button onClick={() => ref.current?.close()} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-subtle hover:text-ink lg:hidden">
                <X size={18} />
              </button>
            </div>
            <p className="mt-5 text-lg">{tool.purpose}</p>
            <ol className="mt-6 grid gap-3">
              {tool.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl bg-subtle/70 p-3.5 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel text-xs font-semibold">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-8">
              {tool.href ? (
                <Link href={tool.href} className="btn-primary">
                  Open {tool.title} <ArrowUpRight size={16} />
                </Link>
              ) : (
                <span className="rounded-full bg-subtle px-4 py-2.5 text-sm font-medium text-muted">Coming soon</span>
              )}
            </div>
          </div>

          <div className="relative">
            <button onClick={() => ref.current?.close()} aria-label="Close" className="absolute -right-4 -top-4 hidden rounded-full p-2 text-muted hover:bg-subtle hover:text-ink lg:block">
              <X size={18} />
            </button>
            <div className="flex aspect-[8/5] items-center justify-center overflow-hidden rounded-2xl border border-line bg-subtle lg:mt-8">
              {playing && tool.demo ? (
                <video key={tool.demo} src={tool.demo} autoPlay muted controls playsInline className="h-full w-full object-cover" />
              ) : tool.demo ? (
                <button onClick={() => setPlaying(true)} className="group/play flex h-full w-full flex-col items-center justify-center gap-3 text-sm font-medium">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-bg shadow-xl transition group-hover/play:scale-110">
                    <Play size={24} className="ml-1" />
                  </span>
                  Watch the demo
                </button>
              ) : (
                <span className="text-sm text-muted">Demo coming soon</span>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

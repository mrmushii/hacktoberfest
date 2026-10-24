"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, FileText, LayoutGrid, Megaphone, Network, PenLine, Presentation, type LucideIcon } from "lucide-react";
import { TOOLS } from "@/lib/tools";

export const TOOL_ICONS: Record<string, LucideIcon> = {
  notices: Megaphone,
  examgraph: Network,
  study: BookOpen,
  planner: CalendarDays,
  cover: FileText,
  assignment: PenLine,
  slides: Presentation,
};

export function Nav() {
  const path = usePathname();
  const link = (href: string, on: boolean) => `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${on ? "bg-subtle font-medium" : "text-muted hover:text-ink"}`;
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      <Link href="/" className={link("/", path === "/")}>
        <LayoutGrid size={16} /> Home
      </Link>
      {TOOLS.filter((t) => t.href).map((t) => {
        const Icon = TOOL_ICONS[t.id];
        return (
          <Link key={t.id} href={t.href!} className={link(t.href!, path.startsWith(t.href!))}>
            <Icon size={16} /> {t.title}
          </Link>
        );
      })}
      <div className="mt-4 hidden px-3 text-[11px] font-medium uppercase tracking-wide text-muted md:block">Coming soon</div>
      {TOOLS.filter((t) => !t.href).map((t) => {
        const Icon = TOOL_ICONS[t.id];
        return (
          <span key={t.id} className="hidden items-center gap-2.5 px-3 py-2 text-sm text-muted/60 md:flex">
            <Icon size={16} /> {t.title}
          </span>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, FileText, LayoutDashboard, Megaphone, Network, Presentation, Settings, PenLine } from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notices", label: "Notice Board", icon: Megaphone },
  { href: "/examgraph", label: "ExamGraph", icon: Network },
  { href: "/study", label: "Study Assistant", icon: BookOpen },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/cover-page", label: "Cover Page", icon: FileText },
];
const soon = [
  { label: "Assignment Studio", icon: PenLine },
  { label: "Presentation Maker", icon: Presentation },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${on ? "bg-subtle font-medium" : "text-muted hover:text-ink"}`}>
            <Icon size={16} /> {label}
          </Link>
        );
      })}
      <div className="mt-4 hidden px-3 text-[11px] font-medium uppercase tracking-wide text-muted md:block">Coming soon</div>
      {soon.map(({ label, icon: Icon }) => (
        <span key={label} className="hidden items-center gap-2.5 px-3 py-2 text-sm text-muted/60 md:flex">
          <Icon size={16} /> {label}
        </span>
      ))}
      <Link href="/status" className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm md:mt-4 ${path === "/status" ? "bg-subtle font-medium" : "text-muted hover:text-ink"}`}>
        <Settings size={16} /> AI status
      </Link>
    </nav>
  );
}

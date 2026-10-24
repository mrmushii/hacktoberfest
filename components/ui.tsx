import Link from "next/link";
import type { ReactNode } from "react";

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-line bg-panel p-5 ${className}`}>{children}</div>
);

export const PageTitle = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
    {action}
  </div>
);

const tones = {
  neutral: "bg-subtle text-ink",
  blue: "bg-accent/10 text-accent",
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/10 text-red-700 dark:text-red-400",
};
export const Badge = ({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) => (
  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
);

export const Button = ({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "ghost" }) => (
  <Link href={href} className={variant === "primary" ? "btn-primary" : "btn-ghost"}>
    {children}
  </Link>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">{children}</div>
);

export function AiBadge({ ai }: { ai: { cached: boolean; durationMs: number; model: string; provider?: string } }) {
  const secs = ai.durationMs / 1000;
  const t = secs >= 60 ? `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s` : `${secs.toFixed(1)}s`;
  return ai.cached ? (
    <Badge tone="blue">⚡ cached · originally {t} · {ai.provider} · {ai.model}</Badge>
  ) : (
    <Badge tone="green">● live · {t} · {ai.provider} · {ai.model}</Badge>
  );
}

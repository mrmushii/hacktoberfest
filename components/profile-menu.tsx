"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Activity, LogOut, Settings, User } from "lucide-react";
import { logout } from "@/app/actions";

export function Avatar({ name, image, size = 32 }: { name: string; image: string | null; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent" style={{ width: size, height: size }}>
      {initials}
    </span>
  );
}

export function ProfileMenu({ name, email, image, subtitle }: { name: string; email: string; image: string | null; subtitle: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = () => [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = items();
        const i = list.indexOf(document.activeElement as HTMLElement);
        list[(i + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length]?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm outline-none hover:bg-subtle focus:bg-subtle";
  return (
    <div ref={root} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="rounded-full ring-accent/40 transition hover:ring-4">
        <Avatar name={name} image={image} />
      </button>
      {open && (
        <div ref={menu} role="menu" className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-line bg-panel p-1.5 shadow-xl">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={name} image={image} size={36} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{name}</div>
              <div className="truncate text-xs text-muted">{email}</div>
              <div className="text-xs text-muted">{subtitle}</div>
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" href="/profile" className={item} onClick={() => setOpen(false)}>
            <User size={16} /> Profile
          </Link>
          <Link role="menuitem" href="/settings" className={item} onClick={() => setOpen(false)}>
            <Settings size={16} /> Settings
          </Link>
          <Link role="menuitem" href="/status" className={item} onClick={() => setOpen(false)}>
            <Activity size={16} /> AI status
          </Link>
          <div className="my-1 border-t border-line" />
          <form action={logout}>
            <button role="menuitem" className={`${item} text-red-600 dark:text-red-400`}>
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Bell, GraduationCap } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/profile";
import { aiStatus } from "@/lib/ai/client";
import { markAllRead, switchProfile } from "./actions";
import { Nav } from "@/components/nav";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "UniHub AI", description: "University notices, exam prep and study tools on open-weight models" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, users, status] = await Promise.all([currentUser(), db.user.findMany({ orderBy: { name: "asc" } }), aiStatus()]);
  const notes = user ? await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }) : [];
  const unread = notes.filter((n) => !n.read).length;

  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
          <aside className="no-print border-line p-4 md:w-60 md:shrink-0 md:border-r">
            <Link href="/" className="mb-6 flex items-center gap-2 px-3 font-semibold">
              <GraduationCap size={20} className="text-accent" /> UniHub AI
            </Link>
            <Nav />
          </aside>
          <div className="min-w-0 flex-1">
            <header className="no-print flex flex-wrap items-center justify-end gap-3 border-b border-line px-4 py-3 md:px-8">
              <Link href="/status" className="mr-auto flex items-center gap-1.5 text-xs text-muted">
                <span className={`h-2 w-2 rounded-full ${status.online ? "bg-emerald-500" : "bg-red-500"}`} />
                {status.online ? `AI online · ${status.models.map((m) => m.name).filter((v, i, a) => a.indexOf(v) === i).join(", ")}` : "AI offline"}
              </Link>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg p-2 hover:bg-subtle" aria-label="Notifications">
                  <Bell size={18} />
                  {unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-line bg-panel p-2 shadow-lg">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-sm font-medium">Notifications</span>
                    {unread > 0 && (
                      <form action={markAllRead}>
                        <button className="text-xs text-accent">Mark all read</button>
                      </form>
                    )}
                  </div>
                  {notes.length === 0 && <p className="px-2 py-4 text-sm text-muted">Nothing yet.</p>}
                  {notes.map((n) => (
                    <Link key={n.id} href={`/notices/${n.noticeId}`} className={`block rounded-lg px-2 py-2 text-sm hover:bg-subtle ${n.read ? "text-muted" : ""}`}>
                      {!n.read && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />}
                      {n.message}
                    </Link>
                  ))}
                </div>
              </details>
              <form action={switchProfile} className="flex items-center gap-2">
                <select name="uid" defaultValue={user?.id} className="input w-auto py-1.5" aria-label="Student profile">
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.department}-{u.semester}
                      {u.section}
                    </option>
                  ))}
                </select>
                <button className="btn-ghost py-1.5">Switch</button>
              </form>
            </header>
            <main className="px-4 py-6 md:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

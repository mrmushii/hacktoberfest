import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, GraduationCap } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser, viewDept } from "@/lib/profile";
import { aiStatus } from "@/lib/ai/client";
import { markAllRead, setViewDepartment } from "@/app/actions";
import { Nav } from "@/components/nav";
import { ProfileMenu } from "@/components/profile-menu";
import { DeptSwitch } from "@/components/dept-switch";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/onboarding");

  const [providers, notes, depts] = await Promise.all([
    aiStatus(),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.course.findMany({ distinct: ["department"], select: { department: true }, orderBy: { department: "asc" } }),
  ]);
  const unread = notes.filter((n) => !n.read).length;
  const status = providers.find((p) => p.online);
  const viewing = viewDept(user);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <aside className="no-print border-line p-4 md:w-60 md:shrink-0 md:border-r">
        <Link href="/" className="mb-6 flex items-center gap-2 px-3 font-semibold">
          <GraduationCap size={20} className="text-accent" /> UniHub AI
        </Link>
        <Nav />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="no-print flex items-center justify-end gap-2 border-b border-line px-4 py-3 md:px-8">
          <Link href="/status" className="mr-auto flex items-center gap-1.5 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${status ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="hidden sm:inline">{status ? `AI online · ${status.provider}` : "AI offline"}</span>
          </Link>
          <DeptSwitch current={viewing} own={user.department ?? ""} departments={depts.map((d) => d.department)} />
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg p-2 hover:bg-subtle" aria-label={`Notifications, ${unread} unread`}>
              <Bell size={18} />
              {unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-panel p-2 shadow-lg">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-sm font-medium">Notifications</span>
                {unread > 0 && (
                  <form action={markAllRead}>
                    <button className="text-xs text-accent">Mark all read</button>
                  </form>
                )}
              </div>
              {notes.length === 0 && <p className="px-2 py-4 text-sm text-muted">You&apos;re all caught up.</p>}
              {notes.map((n) => (
                <Link key={n.id} href={`/notices/${n.noticeId}`} className={`block rounded-lg px-2 py-2 text-sm hover:bg-subtle ${n.read ? "text-muted" : ""}`}>
                  {!n.read && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />}
                  {n.message}
                </Link>
              ))}
            </div>
          </details>
          <ProfileMenu name={user.name} email={user.email} image={user.image} subtitle={`${user.department}-${user.semester}${user.section}`} />
        </header>
        {viewing !== user.department && (
          <div className="no-print flex flex-wrap items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm md:px-8">
            Viewing <b>{viewing}</b> resources.
            <form action={setViewDepartment}>
              <input type="hidden" name="department" value={user.department ?? ""} />
              <button className="font-medium text-accent">Back to {user.department}</button>
            </form>
          </div>
        )}
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

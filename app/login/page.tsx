import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, Megaphone, Network } from "lucide-react";
import { AuthError } from "next-auth";
import { auth, demoLoginEnabled, DEMO_DOMAIN, googleEnabled, signIn, StudentLogin } from "@/auth";
import { db } from "@/lib/db";

const ERRORS: Record<string, string> = {
  AccessDenied: "Access was denied. Try a different Google account.",
  OAuthCallbackError: "Google sign-in was cancelled or failed. Please try again.",
  CredentialsSignin: "That email and student ID don't match. Use the student ID you first signed in with.",
  Configuration: "Sign-in isn't configured on this server yet.",
  Invalid: "Enter a valid email and a student ID of at least 3 characters.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await auth())?.user?.id) redirect("/");
  const { error } = await searchParams;
  const demo = demoLoginEnabled ? await db.user.findMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` }, onboarded: true }, orderBy: { name: "asc" } }) : [];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-accent p-12 text-white lg:flex dark:text-black">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <GraduationCap /> UniHub AI
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Every notice, exam and study tool for your courses, in one place.</h1>
          <ul className="mt-10 space-y-5 text-sm opacity-90">
            {[
              [Megaphone, "Notices that tell you exactly what changed, for your batch only"],
              [Network, "Past-paper analysis that shows which topics keep coming up"],
              [BookOpen, "Summaries and quizzes from your own lecture notes"],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof Megaphone;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                    <I size={18} />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs opacity-70">Runs on open-weight models. Your files never leave this server.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 font-semibold lg:hidden">
            <GraduationCap className="text-accent" /> UniHub AI
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome</h2>
          <p className="mt-1 text-sm text-muted">Sign in with your university email and student ID.</p>
          {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{ERRORS[error] ?? "Sign-in failed. Please try again."}</p>}

          <form
            className="mt-6 grid gap-3"
            action={async (form: FormData) => {
              "use server";
              const input = StudentLogin.safeParse({ email: form.get("email"), studentId: form.get("studentId") });
              if (!input.success) redirect("/login?error=Invalid");
              try {
                await signIn("student", { ...input.data, redirectTo: "/" });
              } catch (e) {
                if (e instanceof AuthError) redirect(`/login?error=${e.type}`);
                throw e; // the success redirect
              }
            }}
          >
            <label>
              <span className="label">University email</span>
              <input name="email" type="email" required autoComplete="email" placeholder="you@university.edu" className="input py-3" />
            </label>
            <label>
              <span className="label">Student ID</span>
              <input name="studentId" required minLength={3} autoComplete="username" placeholder="e.g. 2022-1-60-011" className="input py-3" />
            </label>
            <button className="btn-primary mt-1 py-3">Continue</button>
            <p className="text-xs text-muted">New here? We&apos;ll set up your profile next.</p>
          </form>

          {googleEnabled && (
            <form
              className="mt-3"
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button className="btn-ghost w-full py-3">Continue with Google</button>
            </form>
          )}

          {demoLoginEnabled && (
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" /> or use a demo account <span className="h-px flex-1 bg-line" />
              </div>
              <div className="grid gap-2">
                {[...demo.map((u) => ({ email: u.email, label: u.name, sub: `${u.department}-${u.semester}${u.section}` })), { email: "new", label: "New student", sub: "Try the profile setup" }].map((d) => (
                  <form
                    key={d.email}
                    action={async () => {
                      "use server";
                      await signIn("demo", { email: d.email, redirectTo: "/" });
                    }}
                  >
                    <button className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:bg-subtle">
                      <span>{d.label}</span>
                      <span className="text-xs text-muted">{d.sub}</span>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

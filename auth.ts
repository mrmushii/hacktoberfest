import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/lib/db";

export const demoLoginEnabled = process.env.DEMO_LOGIN === "true";
export const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const DEMO_DOMAIN = "demo.unihub";

export const StudentLogin = z.object({
  email: z.string().trim().toLowerCase().email(),
  studentId: z.string().trim().min(3).max(30),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    ...(googleEnabled ? [Google] : []),
    // Demo sign-in: university email + student ID, no password. The ID must match on later sign-ins.
    Credentials({
      id: "student",
      credentials: { email: {}, studentId: {} },
      async authorize(c) {
        const parsed = StudentLogin.safeParse(c);
        if (!parsed.success) return null;
        const { email, studentId } = parsed.data;
        const existing = await db.user.findUnique({ where: { email } });
        if (existing?.studentId && existing.studentId !== studentId) return null;
        const user = existing
          ? await db.user.update({ where: { email }, data: { studentId } })
          : await db.user.create({ data: { email, studentId, name: "" } });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Offline demo only: sign in as a seeded student, or as a fresh user to try onboarding.
    ...(demoLoginEnabled
      ? [
          Credentials({
            id: "demo",
            credentials: { email: {} },
            async authorize(c) {
              let email = String(c?.email ?? "");
              if (email === "new") email = `student-${Date.now().toString(36)}@${DEMO_DOMAIN}`;
              if (!email.endsWith(`@${DEMO_DOMAIN}`)) return null;
              const user = await db.user.upsert({ where: { email }, create: { email, name: "" }, update: {} });
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const u = await db.user.upsert({
          where: { email: profile.email },
          create: { email: profile.email, name: profile.name ?? "", image: (profile.picture as string) ?? null },
          update: { image: (profile.picture as string) ?? undefined },
        });
        token.uid = u.id;
      } else if (user?.id) {
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      return session;
    },
  },
});

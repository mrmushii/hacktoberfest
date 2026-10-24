"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { remapPapers } from "@/lib/docs/ingest";
import { Profile } from "@/lib/onboarding";
import { currentUser } from "@/lib/profile";

async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Used by onboarding and the profile page: validate, save, replace enrollments. */
export async function saveProfile(input: unknown, finish: boolean): Promise<SaveResult> {
  const u = await requireUser();
  const parsed = Profile.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { courseIds, theme, notifyTypes, ...p } = parsed.data;
  const valid = await db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true } });
  await db.$transaction([
    db.user.update({ where: { id: u.id }, data: { ...p, notifyTypes: JSON.stringify(notifyTypes), onboarded: true, viewDepartment: null } }),
    db.enrollment.deleteMany({ where: { userId: u.id } }),
    db.enrollment.createMany({ data: valid.map((c) => ({ userId: u.id, courseId: c.id })) }),
  ]);
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  if (finish) redirect("/");
  return { ok: true };
}

export async function setViewDepartment(form: FormData) {
  const u = await requireUser();
  const dept = String(form.get("department") ?? "").toUpperCase();
  await db.user.update({ where: { id: u.id }, data: { viewDepartment: !dept || dept === u.department ? null : dept } });
  revalidatePath("/", "layout");
}

export async function setTheme(theme: "system" | "light" | "dark") {
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function markAllRead() {
  const u = await requireUser();
  await db.notification.updateMany({ where: { userId: u.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function toggleTask(form: FormData) {
  const u = await requireUser();
  const id = String(form.get("id"));
  const task = await db.task.findFirst({ where: { id, userId: u.id } });
  if (task) await db.task.update({ where: { id }, data: { done: !task.done } });
  revalidatePath("/", "layout");
}

export async function addTask(form: FormData) {
  const u = await requireUser();
  const title = String(form.get("title") ?? "").trim();
  const due = String(form.get("due") ?? "");
  if (title && /^\d{4}-\d{2}-\d{2}$/.test(due)) await db.task.create({ data: { userId: u.id, title, due } });
  revalidatePath("/planner");
}

/** Student review of a topic assignment; a reviewed mapping gets confidence 1. */
export async function setQuestionTopic(form: FormData) {
  await requireUser();
  const topic = String(form.get("topic") ?? "");
  await db.examQuestion.update({ where: { id: String(form.get("id")) }, data: { topic: topic || null, confidence: 1 } });
  revalidatePath("/examgraph", "layout");
}

export async function remap(form: FormData) {
  await requireUser();
  await remapPapers(String(form.get("courseId")));
  revalidatePath("/examgraph", "layout");
}

export async function archiveNotice(form: FormData) {
  await requireUser();
  await db.notice.update({ where: { id: String(form.get("id")) }, data: { status: "archived" } });
  revalidatePath("/", "layout");
}

/** Students add their own courses; the code is unique across the university, so an existing one is reused. */
export async function addCourse(form: FormData) {
  const u = await requireUser();
  const code = String(form.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "-").slice(0, 20);
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  if (!/^[A-Z0-9-]{2,20}$/.test(code) || !title) return;
  const course = await db.course.upsert({ where: { code }, update: {}, create: { code, title, department: u.department ?? "General", semester: u.semester ?? 1 } });
  await db.enrollment.upsert({ where: { userId_courseId: { userId: u.id, courseId: course.id } }, update: {}, create: { userId: u.id, courseId: course.id } });
  redirect(`/courses/${course.code}`);
}

export async function leaveCourse(form: FormData) {
  const u = await requireUser();
  await db.enrollment.deleteMany({ where: { userId: u.id, courseId: String(form.get("courseId")) } });
  revalidatePath("/", "layout");
  redirect("/courses");
}

/** Only students enrolled in the course may remove its documents. */
export async function deleteDocument(form: FormData) {
  const u = await requireUser();
  const id = String(form.get("id"));
  const doc = await db.courseDocument.findFirst({ where: { id, course: { enrollments: { some: { userId: u.id } } } } });
  if (!doc) return;
  await db.courseDocument.delete({ where: { id } });
  revalidatePath("/", "layout");
}

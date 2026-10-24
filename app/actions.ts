"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { remapPapers } from "@/lib/docs/ingest";
import { currentUser } from "@/lib/profile";

export async function switchProfile(form: FormData) {
  (await cookies()).set("uid", String(form.get("uid")), { path: "/" });
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const u = await currentUser();
  if (u) await db.notification.updateMany({ where: { userId: u.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function toggleTask(form: FormData) {
  const u = await currentUser();
  const id = String(form.get("id"));
  const task = await db.task.findFirst({ where: { id, userId: u?.id } });
  if (task) await db.task.update({ where: { id }, data: { done: !task.done } });
  revalidatePath("/", "layout");
}

export async function addTask(form: FormData) {
  const u = await currentUser();
  const title = String(form.get("title") ?? "").trim();
  const due = String(form.get("due") ?? "");
  if (u && title && /^\d{4}-\d{2}-\d{2}$/.test(due)) await db.task.create({ data: { userId: u.id, title, due } });
  revalidatePath("/planner");
}

/** Student review of a topic assignment; a reviewed mapping gets confidence 1. */
export async function setQuestionTopic(form: FormData) {
  const topic = String(form.get("topic") ?? "");
  await db.examQuestion.update({ where: { id: String(form.get("id")) }, data: { topic: topic || null, confidence: 1 } });
  revalidatePath("/examgraph", "layout");
}

export async function remap(form: FormData) {
  await remapPapers(String(form.get("courseId")));
  revalidatePath("/examgraph", "layout");
}

export async function archiveNotice(form: FormData) {
  await db.notice.update({ where: { id: String(form.get("id")) }, data: { status: "archived" } });
  revalidatePath("/", "layout");
}

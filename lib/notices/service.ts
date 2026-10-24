import { db } from "@/lib/db";
import { sha256 } from "@/lib/hash";
import type { Upload } from "@/lib/docs/pdf";
import { diffNotice, type FieldChange } from "./diff";
import { extractNotice } from "./extract";
import { matchNotice, type Match } from "./match";
import { normalize } from "./normalize";
import { NoticeFields } from "./schema";

export async function latestVersion(noticeId: string) {
  return db.noticeVersion.findFirstOrThrow({ where: { noticeId }, orderBy: { version: "desc" } });
}
export const fieldsOf = (v: { fields: string }) => NoticeFields.parse(JSON.parse(v.fields));

async function candidates() {
  const notices = await db.notice.findMany({ where: { status: { not: "archived" } }, include: { course: true } });
  return Promise.all(
    notices.map(async (n) => {
      const fields = fieldsOf(await latestVersion(n.id));
      return { id: n.id, courseCode: fields.courseCode, department: n.department, eventType: n.eventType, fields, updatedAt: n.updatedAt };
    }),
  );
}

/** Extract + propose a match and diff. Writes nothing except the AI cache. */
export async function analyzeNotice(up: Upload) {
  const ext = await extractNotice(up);
  const match = matchNotice(ext.data, await candidates());
  const changes = match.kind === "update" ? diffNotice(fieldsOf(await latestVersion(match.noticeId)), ext.data) : [];
  return {
    fields: ext.data,
    rawText: ext.rawText,
    match,
    changes,
    ai: { cached: ext.cached, durationMs: ext.durationMs, model: ext.model },
    sourceName: up.name,
    contentHash: sha256(up.bytes),
  };
}

export type PublishInput = {
  fields: NoticeFields;
  rawText: string;
  sourceName: string;
  contentHash: string;
  target: Match; // confirmed by the user
};

const audienceWhere = (f: NoticeFields) => ({
  department: f.department,
  ...(f.semester !== null && { semester: f.semester }),
  ...(f.sections.length > 0 && { section: { in: f.sections } }),
});

/** Human-confirmed publish: store a new version, its changes, notify the audience, sync planner tasks. */
export async function publishNotice(input: PublishInput) {
  const f = normalize(NoticeFields.parse(input.fields));
  const course = f.courseCode ? await db.course.findUnique({ where: { code: f.courseCode } }) : null;

  return db.$transaction(async (tx) => {
    let noticeId: string;
    let version = 1;
    let changes: FieldChange[] = [];
    const meta = {
      courseId: course?.id ?? null,
      eventType: f.eventType,
      department: f.department,
      semester: f.semester,
      sections: JSON.stringify(f.sections),
      status: f.cancelled ? "cancelled" : "active",
    };
    if (input.target.kind === "update") {
      noticeId = input.target.noticeId;
      const prev = await tx.noticeVersion.findFirstOrThrow({ where: { noticeId }, orderBy: { version: "desc" } });
      version = prev.version + 1;
      changes = diffNotice(fieldsOf(prev), f);
      await tx.notice.update({ where: { id: noticeId }, data: meta });
    } else {
      noticeId = (await tx.notice.create({ data: meta })).id;
    }

    await tx.noticeVersion.create({
      data: {
        noticeId,
        version,
        title: f.title,
        fields: JSON.stringify(f),
        rawText: input.rawText,
        sourceName: input.sourceName,
        contentHash: input.contentHash,
        changes: { create: changes.map(({ field, kind, before, after }) => ({ field, kind, before, after })) },
      },
    });

    const users = await tx.user.findMany({ where: audienceWhere(f) });
    const message =
      version === 1
        ? `New notice: ${f.title}`
        : f.cancelled
          ? `Cancelled: ${f.title}`
          : `Updated: ${f.title} — ${changes.map((c) => `${c.label} ${c.before ?? "—"} → ${c.after ?? "—"}`).join("; ") || "no field changes"}`;
    await tx.notification.createMany({ data: users.map((u) => ({ userId: u.id, noticeId, message })) });

    // Drop planner tasks for students no longer in the audience.
    await tx.task.deleteMany({ where: { noticeId, userId: { notIn: users.map((u) => u.id) } } });
    const due = f.deadline ?? f.date;
    for (const u of users) {
      if (f.cancelled || !due) {
        await tx.task.deleteMany({ where: { userId: u.id, noticeId } });
        continue;
      }
      const data = { title: `${f.courseCode ?? f.department} ${f.eventName}${f.room ? ` · Room ${f.room}` : ""}`, due: f.time ? `${due}T${f.time}` : due };
      await tx.task.upsert({ where: { userId_noticeId: { userId: u.id, noticeId } }, create: { userId: u.id, noticeId, ...data }, update: data });
    }
    return { noticeId, version, changes, notified: users.length };
  });
}

import { revalidatePath } from "next/cache";
import { handle } from "@/lib/api";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/profile";
import { ingestDocument, type DocKind } from "@/lib/docs/ingest";
import { uploadFromForm } from "@/lib/docs/pdf";

export const maxDuration = 300;

export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    const up = await uploadFromForm(form);
    const kind = String(form.get("kind")) as DocKind;
    if (!up || !["syllabus", "lecture", "paper"].includes(kind)) throw new Error("File and kind are required.");
    const courseId = String(form.get("courseId"));
    const { document, reused } = await ingestDocument(courseId, kind, up);
    // Uploading to a course puts it in your course list.
    const user = (await currentUser())!;
    await db.enrollment.upsert({ where: { userId_courseId: { userId: user.id, courseId } }, update: {}, create: { userId: user.id, courseId } });
    revalidatePath("/", "layout");
    return { id: document.id, reused };
  });
}

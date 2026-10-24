import { revalidatePath } from "next/cache";
import { handle } from "@/lib/api";
import { ingestDocument, type DocKind } from "@/lib/docs/ingest";
import { uploadFromForm } from "@/lib/docs/pdf";

export const maxDuration = 300;

export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    const up = await uploadFromForm(form);
    const kind = String(form.get("kind")) as DocKind;
    if (!up || !["syllabus", "lecture", "paper"].includes(kind)) throw new Error("File and kind are required.");
    const { document, reused } = await ingestDocument(String(form.get("courseId")), kind, up);
    revalidatePath("/", "layout");
    return { id: document.id, reused };
  });
}

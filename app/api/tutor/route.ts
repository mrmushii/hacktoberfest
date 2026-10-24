import { handle } from "@/lib/api";
import { uploadFromForm, uploadPages } from "@/lib/docs/pdf";
import { buildLesson } from "@/lib/tutor/lesson";

export const maxDuration = 300;

/** multipart: text (typed, or OCR'd in the browser for photos), optional document file, lang. */
export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    const up = await uploadFromForm(form);
    let text = String(form.get("text") ?? "");
    if (up && up.kind !== "image") text = `${text}\n${(await uploadPages(up)).join("\n")}`;
    return buildLesson(text, form.get("lang") === "bn" ? "bn" : "en");
  });
}

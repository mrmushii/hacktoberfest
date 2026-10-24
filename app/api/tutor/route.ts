import { handle } from "@/lib/api";
import { pdfPages } from "@/lib/docs/pdf";
import { buildLesson } from "@/lib/tutor/lesson";

export const maxDuration = 300;

/** multipart: text (typed or OCR'd in the browser), optional pdf, lang. */
export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    const pdf = form.get("pdf");
    let text = String(form.get("text") ?? "");
    if (pdf instanceof File && pdf.size) text = `${text}\n${(await pdfPages(new Uint8Array(await pdf.arrayBuffer()))).join("\n")}`;
    return buildLesson(text, form.get("lang") === "bn" ? "bn" : "en");
  });
}

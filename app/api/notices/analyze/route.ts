import { handle } from "@/lib/api";
import { readUpload } from "@/lib/docs/pdf";
import { analyzeNotice } from "@/lib/notices/service";

export const maxDuration = 300;

export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    const file = form.get("file");
    const text = String(form.get("text") ?? "").trim();
    if (file instanceof File && file.size > 0) {
      const up = await readUpload(file);
      const ocrText = String(form.get("ocrText") ?? "");
      const confidence = Number(form.get("ocrConfidence"));
      if (up.kind === "image" && ocrText) up.ocr = { text: ocrText.slice(0, 20000), confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 100) : 0 };
      return analyzeNotice(up);
    }
    if (text) return analyzeNotice({ name: "Pasted text", kind: "text", bytes: new TextEncoder().encode(text), text });
    throw new Error("Upload a file or paste notice text.");
  });
}

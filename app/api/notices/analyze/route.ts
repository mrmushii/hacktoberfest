import { handle } from "@/lib/api";
import { uploadFromForm } from "@/lib/docs/pdf";
import { analyzeNotice } from "@/lib/notices/service";

export const maxDuration = 300;

export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    const text = String(form.get("text") ?? "").trim();
    const up = await uploadFromForm(form);
    if (up) return analyzeNotice(up);
    if (text) return analyzeNotice({ name: "Pasted text", kind: "text", bytes: new TextEncoder().encode(text), text });
    throw new Error("Upload a file or paste notice text.");
  });
}

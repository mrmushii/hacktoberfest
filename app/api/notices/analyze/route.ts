import { handle } from "@/lib/api";
import { readUpload } from "@/lib/docs/pdf";
import { analyzeNotice } from "@/lib/notices/service";

export const maxDuration = 600;

export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    const file = form.get("file");
    const text = String(form.get("text") ?? "").trim();
    if (file instanceof File && file.size > 0) return analyzeNotice(await readUpload(file));
    if (text) return analyzeNotice({ name: "Pasted text", kind: "text", bytes: new TextEncoder().encode(text), text });
    throw new Error("Upload a file or paste notice text.");
  });
}

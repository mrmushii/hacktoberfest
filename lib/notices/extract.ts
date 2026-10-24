import { generate } from "@/lib/ai/client";
import { pdfPages, type Upload } from "@/lib/docs/pdf";
import { normalize, verifyDates } from "./normalize";
import { NoticeFields } from "./schema";

const SYSTEM = `You extract structured data from university notices.
Return only facts stated in the notice; use null or [] when absent. Never guess.
For every field you fill, add an evidence entry quoting the exact source text.
List in "uncertain" any field that is ambiguous, illegible or inferred.
"date" is when the exam/event happens; "publishedOn" is when the notice was issued — never mix them.
Dates as YYYY-MM-DD, times as 24h HH:MM. Department as a short code (CSE, EEE, BBA).`;

/** Below this mean OCR confidence, every extracted fact needs a human check. */
export const OCR_MIN_CONFIDENCE = 70;
const FACT_FIELDS = ["courseCode", "date", "time", "room", "deadline"] as const;

export async function extractNotice(up: Upload) {
  let rawText = up.text ?? "";
  if (up.kind === "pdf") rawText = (await pdfPages(up.bytes)).join("\n\n");
  if (up.kind === "pdf" && rawText.trim().length < 20) throw new Error("This PDF has no selectable text. Upload a photo (JPG/PNG) of it instead.");

  const ocr = up.kind === "image" && up.ocr && up.ocr.text.trim().length >= 20 ? up.ocr : null;
  if (up.kind === "image") rawText = ocr?.text ?? "";
  const image = up.kind === "image";

  const res = await generate({
    task: "notice.extract@2",
    tier: image ? "smart" : "fast",
    schema: NoticeFields,
    system: SYSTEM,
    // Images: OCR text goes to every provider; vision-capable ones (Ollama) also get the image to correct OCR errors.
    prompt: !image
      ? `Notice:\n"""\n${rawText.slice(0, 12000)}\n"""`
      : ocr
        ? `Extract the notice in the image. OCR text of the image (may contain recognition errors):\n"""\n${ocr.text.slice(0, 12000)}\n"""`
        : "Extract the notice in this image.",
    images: image ? [up.bytes] : undefined,
    imageOnly: image && !ocr,
  });

  let data = normalize(res.data);
  if (rawText) data = verifyDates(data, rawText);
  if (ocr && ocr.confidence < OCR_MIN_CONFIDENCE) {
    data = { ...data, uncertain: [...new Set([...data.uncertain, ...FACT_FIELDS.filter((k) => data[k] !== null)])] };
  }
  return { ...res, data, ocrConfidence: ocr?.confidence ?? null, rawText: rawText || res.data.evidence.map((e) => e.quote).join("\n") };
}

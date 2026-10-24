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

export async function extractNotice(up: Upload) {
  let rawText = up.text ?? "";
  if (up.kind === "pdf") rawText = (await pdfPages(up.bytes)).join("\n\n");
  const useImage = up.kind === "image" || (up.kind === "pdf" && rawText.trim().length < 20);
  if (useImage && up.kind === "pdf") throw new Error("This PDF has no selectable text. Upload a photo (JPG/PNG) of it instead.");

  const res = await generate({
    task: "notice.extract@2",
    tier: useImage ? "smart" : "fast",
    schema: NoticeFields,
    system: SYSTEM,
    prompt: useImage ? "Extract the notice in this image." : `Notice:\n"""\n${rawText.slice(0, 12000)}\n"""`,
    images: useImage ? [up.bytes] : undefined,
  });
  const data = normalize(res.data);
  return { ...res, data: useImage ? data : verifyDates(data, rawText), rawText: useImage ? res.data.evidence.map((e) => e.quote).join("\n") : rawText };
}

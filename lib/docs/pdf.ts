import { extractText, getDocumentProxy } from "unpdf";
import { tooBig } from "./accept";

/** Text per page; empty pages usually mean a scanned PDF. */
export async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((t) => t.replace(/[ \t]+/g, " ").trim());
}

/** ocr: text the browser read from an image (tesseract.js), with its mean confidence 0–100. */
export type Upload = { name: string; kind: "pdf" | "image" | "text"; bytes: Uint8Array; text?: string; ocr?: { text: string; confidence: number } };


const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";
const xmlText = (xml: string) =>
  [...xml.matchAll(/<a:t>([^<]*)<\/a:t>|<\/a:p>/g)]
    .map((m) => (m[1] === undefined ? "\n" : m[1]))
    .join("")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\n{2,}/g, "\n")
    .trim();

/** One page per slide, in slide order; speaker notes appended to their slide. */
export async function pptxPages(bytes: Uint8Array): Promise<string[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const num = (p: string) => Number(p.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const slides = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => num(a) - num(b));
  return Promise.all(
    slides.map(async (p) => {
      const notes = zip.file(`ppt/notesSlides/notesSlide${num(p)}.xml`);
      return [xmlText(await zip.file(p)!.async("string")), notes ? xmlText(await notes.async("string")) : ""].filter(Boolean).join("\n\nNotes: ");
    }),
  );
}

export async function readUpload(file: File): Promise<Upload> {
  const big = tooBig(file);
  if (big) throw new Error(big);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const e = ext(file.name);
  if (file.type === "application/pdf" || e === "pdf") return { name: file.name, kind: "pdf", bytes };
  if (file.type.startsWith("image/")) return { name: file.name, kind: "image", bytes };
  if (e === "docx") {
    const { default: mammoth } = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { name: file.name, kind: "text", bytes, text: value.trim() };
  }
  // Slides become pages (\f), so citations point at slide numbers.
  if (e === "pptx") return { name: file.name, kind: "text", bytes, text: (await pptxPages(bytes)).join("\f") };
  if (e === "doc" || e === "ppt") throw new Error(`Old .${e} files can't be read. Open it and save as .${e}x (or PDF), then upload again.`);
  return { name: file.name, kind: "text", bytes, text: new TextDecoder().decode(bytes) };
}

/** A form's file plus the OCR text the browser attached for images (see withOcr in lib/ocr.ts). */
export async function uploadFromForm(form: FormData, field = "file"): Promise<Upload | null> {
  const file = form.get(field);
  if (!(file instanceof File) || !file.size) return null;
  const up = await readUpload(file);
  const ocrText = String(form.get("ocrText") ?? "");
  const confidence = Number(form.get("ocrConfidence"));
  if (up.kind === "image" && ocrText) up.ocr = { text: ocrText.slice(0, 20000), confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 100) : 0 };
  return up;
}

/** Plain text pages for any upload kind; images use their OCR text. */
export async function uploadPages(up: Upload): Promise<string[]> {
  if (up.kind === "pdf") return pdfPages(up.bytes);
  if (up.kind === "image") return [up.ocr?.text ?? ""];
  return (up.text ?? "").split("\f");
}

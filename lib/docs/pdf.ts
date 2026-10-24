import { extractText, getDocumentProxy } from "unpdf";

/** Text per page; empty pages usually mean a scanned PDF. */
export async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((t) => t.replace(/[ \t]+/g, " ").trim());
}

/** ocr: text the browser read from an image (tesseract.js), with its mean confidence 0–100. */
export type Upload = { name: string; kind: "pdf" | "image" | "text"; bytes: Uint8Array; text?: string; ocr?: { text: string; confidence: number } };

export async function readUpload(file: File): Promise<Upload> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return { name: file.name, kind: "pdf", bytes };
  if (file.type.startsWith("image/")) return { name: file.name, kind: "image", bytes };
  return { name: file.name, kind: "text", bytes, text: new TextDecoder().decode(bytes) };
}

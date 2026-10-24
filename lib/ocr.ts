"use client";

import type { Worker } from "tesseract.js";

// One worker per tab, loaded lazily from /public/tesseract (no network needed).
let worker: Promise<Worker> | null = null;
let onProgress: ((p: number) => void) | null = null;

async function getWorker() {
  worker ??= import("tesseract.js").then(({ createWorker }) =>
    createWorker(["eng", "ben"], 1, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/core",
      langPath: "/tesseract/lang",
      gzip: true,
      logger: (m) => m.status === "recognizing text" && onProgress?.(m.progress),
    }),
  );
  return worker;
}

/** Read text from an image in the browser. confidence is Tesseract's mean word confidence (0–100). */
export async function ocrImage(file: File, progress?: (p: number) => void) {
  onProgress = progress ?? null;
  try {
    const { data } = await (await getWorker()).recognize(file);
    return { text: data.text.trim(), confidence: Math.round(data.confidence) };
  } finally {
    onProgress = null;
  }
}

/** For forms with an image file: read it in the browser and attach ocrText/ocrConfidence for the server. */
export async function withOcr(form: FormData, progress?: (p: number) => void, field = "file") {
  const file = form.get(field);
  if (!(file instanceof File) || !file.type.startsWith("image/")) return;
  try {
    const ocr = await ocrImage(file, progress);
    form.set("ocrText", ocr.text);
    form.set("ocrConfidence", String(ocr.confidence));
  } catch {
    // Best effort: vision-capable models can still read the image itself.
  }
}

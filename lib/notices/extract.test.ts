import { expect, it, vi } from "vitest";

const generate = vi.fn();
vi.mock("@/lib/ai/client", () => ({ generate: (...a: unknown[]) => generate(...a) }));
const { extractNotice } = await import("./extract");

const fields = {
  title: "Midterm", publishedOn: "2026-10-22", department: "CSE", courseCode: "CSE-301", eventType: "exam", eventName: "Midterm",
  semester: 5, sections: ["A"], date: "2026-11-15", time: "10:00", room: "501", deadline: null, cancelled: false,
  actions: [], evidence: [], uncertain: [],
};
const ok = () => generate.mockResolvedValueOnce({ data: structuredClone(fields), cached: false, durationMs: 1, model: "m", provider: "groq" });
const img = (ocr?: { text: string; confidence: number }) => ({ name: "n.jpg", kind: "image" as const, bytes: new Uint8Array([1]), ocr });
const TEXT = "CSE-301 Midterm rescheduled to 15 November 2026 at 10:00 AM in Room 501. Issued 22 October 2026.";

it("sends OCR text with the image and keeps confident results", async () => {
  ok();
  const r = await extractNotice(img({ text: TEXT, confidence: 91 }));
  const call = generate.mock.calls.at(-1)![0];
  expect(call.prompt).toContain("Room 501");
  expect(call.imageOnly).toBe(false);
  expect(r.data.uncertain).toEqual([]);
  expect(r.ocrConfidence).toBe(91);
});

it("marks extracted facts uncertain when OCR confidence is low", async () => {
  ok();
  const r = await extractNotice(img({ text: TEXT, confidence: 48 }));
  expect(r.data.uncertain).toEqual(expect.arrayContaining(["courseCode", "date", "time", "room"]));
});

it("checks dates against the OCR text", async () => {
  ok();
  const r = await extractNotice(img({ text: TEXT.replace("15 November", "18 November"), confidence: 95 }));
  expect(r.data.uncertain).toContain("date");
});

it("without OCR text the request is image-only", async () => {
  ok();
  await extractNotice(img());
  expect(generate.mock.calls.at(-1)![0].imageOnly).toBe(true);
});

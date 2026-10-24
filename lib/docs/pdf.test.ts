import JSZip from "jszip";
import { expect, it } from "vitest";
import { readUpload, uploadPages } from "./pdf";

const file = async (name: string, zip: JSZip) => new File([await zip.generateAsync({ type: "uint8array" })], name);

it("reads a .pptx as one page per slide, in slide order, with notes", async () => {
  const z = new JSZip();
  const slide = (t: string[]) => `<p:sld><p:txBody>${t.map((x) => `<a:p><a:r><a:t>${x}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sld>`;
  z.file("ppt/slides/slide10.xml", slide(["Ten"]));
  z.file("ppt/slides/slide2.xml", slide(["Heaps &amp; trees", "O(log n)"]));
  z.file("ppt/slides/slide1.xml", slide(["Intro"]));
  z.file("ppt/notesSlides/notesSlide2.xml", slide(["say this"]));
  const up = await readUpload(await file("deck.pptx", z));
  expect(await uploadPages(up)).toEqual(["Intro", "Heaps & trees\nO(log n)\n\nNotes: say this", "Ten"]);
});

it("reads a .docx", async () => {
  const z = new JSZip();
  z.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Exam on 12 Nov, Room 501</w:t></w:r></w:p></w:body></w:document>');
  expect((await readUpload(await file("notice.docx", z))).text).toBe("Exam on 12 Nov, Room 501");
});

it("rejects old binary .doc/.ppt with a clear message, and oversized files", async () => {
  await expect(readUpload(new File(["x"], "old.ppt"))).rejects.toThrow(/save as \.pptx/);
  await expect(readUpload(new File([new Uint8Array(5 * 1024 * 1024)], "big.pdf"))).rejects.toThrow(/larger than 4 MB/);
});

it("images use the browser's OCR text", async () => {
  const up = await readUpload(new File(["x"], "a.png", { type: "image/png" }));
  expect(await uploadPages({ ...up, ocr: { text: "hello", confidence: 90 } })).toEqual(["hello"]);
});

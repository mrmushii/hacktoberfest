// Copies the OCR worker, WASM core and language data into public/ so OCR works fully offline.
import { cpSync, mkdirSync, readdirSync } from "node:fs";

const out = "public/tesseract";
mkdirSync(`${out}/core`, { recursive: true });
mkdirSync(`${out}/lang`, { recursive: true });
cpSync("node_modules/tesseract.js/dist/worker.min.js", `${out}/worker.min.js`);
for (const f of readdirSync("node_modules/tesseract.js-core").filter((f) => /^tesseract-core.*\.(wasm|js)$/.test(f))) {
  cpSync(`node_modules/tesseract.js-core/${f}`, `${out}/core/${f}`);
}
for (const lang of ["eng", "ben"]) {
  cpSync(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`, `${out}/lang/${lang}.traineddata.gz`);
}
console.log("tesseract assets copied to", out);

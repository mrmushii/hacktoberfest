/**
 * npm run reset   — wipe demo data (keeps the AI cache), seed users/courses, load samples through the real pipeline.
 * npm run prewarm — same, and also run extraction on the revised notices so the live demo is instant.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { ingestDocument, type DocKind } from "@/lib/docs/ingest";
import type { Upload } from "@/lib/docs/pdf";
import { analyzeNotice, publishNotice } from "@/lib/notices/service";

const prewarm = process.argv.includes("--prewarm");
const SAMPLES = join(process.cwd(), "samples");

async function load(path: string): Promise<Upload> {
  const bytes = new Uint8Array(await readFile(path));
  const name = path.split("/").pop()!;
  if (name.endsWith(".pdf")) return { name, kind: "pdf", bytes };
  if (/\.(png|jpe?g)$/i.test(name)) return { name, kind: "image", bytes };
  return { name, kind: "text", bytes, text: new TextDecoder().decode(bytes) };
}

async function timed<T>(label: string, fn: () => Promise<T>) {
  const t = Date.now();
  const r = await fn();
  console.log(`  ✓ ${label} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  return r;
}

async function main() {
  console.log("Resetting data (AI cache kept)…");
  await db.$transaction([
    db.notification.deleteMany(),
    db.task.deleteMany(),
    db.notice.deleteMany(),
    db.studyArtifact.deleteMany(),
    db.courseDocument.deleteMany(),
    db.course.deleteMany(),
    db.user.deleteMany(),
  ]);

  await db.user.createMany({
    data: [
      { name: "Ayesha Rahman", department: "CSE", semester: 5, section: "A" },
      { name: "Tanvir Hasan", department: "CSE", semester: 5, section: "B" },
      { name: "Nusrat Jahan", department: "EEE", semester: 3, section: "A" },
    ],
  });
  await db.course.createMany({
    data: [
      { code: "CSE-301", title: "Data Structures", department: "CSE", semester: 5 },
      { code: "CSE-303", title: "Database Systems", department: "CSE", semester: 5 },
      { code: "EEE-201", title: "Electrical Circuits", department: "EEE", semester: 3 },
    ],
  });

  console.log("Publishing original notices…");
  for (const f of (await readdir(join(SAMPLES, "notices"))).sort()) {
    const a = await timed(f, async () => analyzeNotice(await load(join(SAMPLES, "notices", f))));
    await publishNotice({ ...a, target: { kind: "new" } });
  }

  for (const code of await readdir(SAMPLES)) {
    const course = await db.course.findUnique({ where: { code } });
    if (!course) continue;
    console.log(`Analysing ${code} documents…`);
    const files = (await readdir(join(SAMPLES, code))).sort();
    const kindOf = (f: string): DocKind => (f.startsWith("syllabus") ? "syllabus" : f.startsWith("paper") ? "paper" : "lecture");
    // Syllabus first so papers can be mapped to its topics.
    for (const f of files.sort((a, b) => Number(kindOf(b) === "syllabus") - Number(kindOf(a) === "syllabus"))) {
      await timed(f, async () => ingestDocument(course.id, kindOf(f), await load(join(SAMPLES, code, f))));
    }
  }

  if (prewarm) {
    console.log("Pre-warming revised notices (not published)…");
    for (const f of (await readdir(join(SAMPLES, "revised"))).sort()) {
      await timed(f, async () => analyzeNotice(await load(join(SAMPLES, "revised", f))));
    }
  }
  console.log(`Done. AI cache holds ${await db.aiCache.count()} results.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

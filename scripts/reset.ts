/**
 * npm run reset   — wipe demo data (keeps the AI cache), seed users/courses, load samples through the real pipeline.
 * npm run prewarm — same, and also run extraction on the revised notices so the live demo is instant.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEMO_DOMAIN } from "@/auth";
import { db } from "@/lib/db";
import { ingestDocument, type DocKind } from "@/lib/docs/ingest";
import type { Upload } from "@/lib/docs/pdf";
import { topicFrequency, type Topic } from "@/lib/exam/analysis";
import { practiceFor } from "@/lib/exam/practice";
import { analyzeNotice, publishNotice } from "@/lib/notices/service";
import { quiz, summarize } from "@/lib/study";
import { buildLesson } from "@/lib/tutor/lesson";
import { DEMO_TEXT } from "@/lib/tutor/demo";

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
  ]);

  // Demo students (DEMO_LOGIN). Real Google users are kept across resets; only demo accounts are recreated.
  await db.user.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } });
  const university = "University of Dhaka";
  await db.user.createMany({
    data: [
      { email: `ayesha@${DEMO_DOMAIN}`, name: "Ayesha Rahman", university, studentId: "2022-1-60-011", department: "CSE", semester: 5, section: "A", onboarded: true },
      { email: `tanvir@${DEMO_DOMAIN}`, name: "Tanvir Hasan", university, studentId: "2022-1-60-047", department: "CSE", semester: 5, section: "B", onboarded: true },
      { email: `nusrat@${DEMO_DOMAIN}`, name: "Nusrat Jahan", university, studentId: "2023-2-50-019", department: "EEE", semester: 3, section: "A", onboarded: true },
    ],
  });
  await db.course.createMany({
    data: [
      { code: "CSE-301", title: "Data Structures", department: "CSE", semester: 5 },
      { code: "CSE-303", title: "Database Systems", department: "CSE", semester: 5 },
      { code: "EEE-201", title: "Electrical Circuits", department: "EEE", semester: 3 },
    ],
  });
  // Enroll every onboarded student in their batch's courses (keeps real users' choices if they still exist).
  for (const u of await db.user.findMany({ where: { onboarded: true } })) {
    const courses = await db.course.findMany({ where: { department: u.department!, semester: u.semester! } });
    await db.enrollment.createMany({ data: courses.map((c) => ({ userId: u.id, courseId: c.id })) });
  }

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
    console.log("Pre-warming study tools and practice questions…");
    for (const course of await db.course.findMany({ include: { documents: { include: { questions: true } } } })) {
      const papers = course.documents.filter((d) => d.kind === "paper");
      for (const d of course.documents.filter((d) => d.kind === "lecture")) {
        const pages = JSON.parse(d.pages) as string[];
        await timed(`${d.name} summary`, () => summarize(pages));
        await timed(`${d.name} quiz`, () => quiz(pages));
      }
      for (const s of topicFrequency(JSON.parse(course.topics) as Topic[], papers).filter((s) => s.papers > 0)) {
        await timed(`practice: ${s.topic}`, () => practiceFor(course.id, s.topic));
      }
    }
    await timed("tutor demo lesson", () => buildLesson(DEMO_TEXT, "en"));
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

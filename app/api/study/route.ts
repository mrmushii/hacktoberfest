import { handle } from "@/lib/api";
import { db } from "@/lib/db";
import { ask, quiz, summarize } from "@/lib/study";

export const maxDuration = 300;

export async function POST(req: Request) {
  return handle(async () => {
    const { documentId, action, question } = (await req.json()) as { documentId: string; action: "summary" | "quiz" | "ask"; question?: string };
    const doc = await db.courseDocument.findUniqueOrThrow({ where: { id: documentId } });
    const pages = JSON.parse(doc.pages) as string[];
    const res = action === "summary" ? await summarize(pages) : action === "quiz" ? await quiz(pages) : await ask(pages, question ?? "");
    if (action !== "ask") await db.studyArtifact.create({ data: { courseId: doc.courseId, kind: action, content: JSON.stringify(res.data) } });
    return res;
  });
}

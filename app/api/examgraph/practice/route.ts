import { handle } from "@/lib/api";
import { practiceFor } from "@/lib/exam/practice";

export const maxDuration = 300;

export async function POST(req: Request) {
  return handle(async () => {
    const { courseId, topic } = (await req.json()) as { courseId: string; topic: string };
    return practiceFor(courseId, topic);
  });
}

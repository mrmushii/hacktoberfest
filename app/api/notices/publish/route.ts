import { revalidatePath } from "next/cache";
import { handle } from "@/lib/api";
import { publishNotice, type PublishInput } from "@/lib/notices/service";

export async function POST(req: Request) {
  return handle(async () => {
    const result = await publishNotice((await req.json()) as PublishInput);
    revalidatePath("/", "layout");
    return result;
  });
}

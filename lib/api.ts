import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai/client";
import { currentUser } from "@/lib/profile";

/** Uniform JSON errors; AI failures surface as 503 so the UI never shows a fabricated result. */
export async function handle(fn: () => Promise<unknown>) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    const status = e instanceof AiError ? 503 : 400;
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

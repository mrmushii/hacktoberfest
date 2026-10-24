import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai/client";

export async function GET() {
  return NextResponse.json(await aiStatus());
}

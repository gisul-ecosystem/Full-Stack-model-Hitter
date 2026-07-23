import { NextResponse } from "next/server";
import { processSubmissionQueue } from "@/lib/submission-queue";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST() {
  try {
    const result = await processSubmissionQueue();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Queue process failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

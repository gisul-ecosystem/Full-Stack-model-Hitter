import { NextRequest, NextResponse } from "next/server";
import { reevaluateSubmission } from "@/lib/submission-queue";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const submissionId =
      typeof body?.submissionId === "string" ? body.submissionId.trim() : "";
    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }

    const submission = await reevaluateSubmission(submissionId);
    return NextResponse.json({
      ok: true,
      submission: submission
        ? {
            id: String(submission._id),
            status: submission.status,
            score: submission.score,
            feedback: submission.feedback,
            error: submission.error,
            filesSentToModel: submission.filesSentToModel,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reevaluate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Student } from "@/lib/models/Student";
import { Test } from "@/lib/models/Test";
import { TestCandidate } from "@/lib/models/TestCandidate";
import { Submission } from "@/lib/models/Submission";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectMongo();

    const [
      students,
      tests,
      candidates,
      emailSent,
      emailPending,
      scored,
      submissions,
      scoringQueued,
      scoringRunning,
      recentTests,
    ] = await Promise.all([
      Student.countDocuments(),
      Test.countDocuments(),
      TestCandidate.countDocuments(),
      TestCandidate.countDocuments({ emailStatus: "sent" }),
      TestCandidate.countDocuments({ emailStatus: "pending" }),
      TestCandidate.countDocuments({ scoreStatus: "completed" }),
      Submission.countDocuments(),
      Submission.countDocuments({ status: { $in: ["queued", "extracted"] } }),
      Submission.countDocuments({ status: { $in: ["extracting", "scoring"] } }),
      Test.find().sort({ updatedAt: -1 }).limit(5).lean(),
    ]);

    return NextResponse.json({
      stats: {
        students,
        tests,
        candidates,
        emailSent,
        emailPending,
        scored,
        submissions,
        scoringQueued,
        scoringRunning,
      },
      recentTests,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

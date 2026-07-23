import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Test } from "@/lib/models/Test";
import { TestCandidate } from "@/lib/models/TestCandidate";
import { Submission } from "@/lib/models/Submission";
import type { QueueJobDto } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectMongo();

    const [pendingEmails, failedEmails, zipCounts, activeSubs, recentSubs, tests] =
      await Promise.all([
        TestCandidate.countDocuments({ emailStatus: "pending" }),
        TestCandidate.countDocuments({ emailStatus: "failed" }),
        Submission.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              filesExtracted: { $sum: "$filesExtracted" },
              filesSentToModel: { $sum: "$filesSentToModel" },
            },
          },
        ]),
        Submission.find({
          status: { $in: ["queued", "extracting", "extracted", "scoring"] },
        })
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean(),
        Submission.find().sort({ updatedAt: -1 }).limit(30).lean(),
        Test.find().select({ title: 1 }).lean(),
      ]);

    const testTitleById = new Map(tests.map((t) => [String(t._id), t.title as string]));

    const countByStatus = Object.fromEntries(
      zipCounts.map((row) => [
        row._id as string,
        row as { count: number; filesExtracted: number; filesSentToModel: number },
      ])
    );

    const scoringJobs: QueueJobDto[] = activeSubs.map((s) => {
      const statusMap = {
        queued: "queued",
        extracting: "running",
        extracted: "waiting",
        scoring: "running",
      } as const;
      const mapped = statusMap[s.status as keyof typeof statusMap] || "queued";
      return {
        id: String(s._id),
        type: "scoring" as const,
        label: `${s.name} <${s.email}>`,
        status: mapped,
        progress: {
          current: s.filesSentToModel || 0,
          total: Math.max(s.filesExtracted || 0, 1),
        },
        detail: `${testTitleById.get(String(s.testId)) || "Test"} · ZIP ${s.originalFilename} · extracted ${s.filesExtracted} · sent ${s.filesSentToModel}`,
        updatedAt: new Date(
          (s as { updatedAt?: Date }).updatedAt || Date.now()
        ).toISOString(),
      };
    });

    if (pendingEmails > 0) {
      scoringJobs.push({
        id: "email-backlog",
        type: "email",
        label: "Email backlog",
        status: "waiting",
        progress: { current: 0, total: pendingEmails },
        detail: `${pendingEmails} test candidates waiting to be emailed`,
        updatedAt: new Date().toISOString(),
      });
    }

    const summary = {
      email: {
        running: 0,
        waiting: pendingEmails,
        failed: failedEmails,
      },
      scoring: {
        running:
          (countByStatus.scoring?.count || 0) + (countByStatus.extracting?.count || 0),
        queued: (countByStatus.queued?.count || 0) + (countByStatus.extracted?.count || 0),
        failed: countByStatus.failed?.count || 0,
        completed: countByStatus.completed?.count || 0,
        zipsTotal: zipCounts.reduce((n, r) => n + r.count, 0),
        filesExtracted: zipCounts.reduce((n, r) => n + (r.filesExtracted || 0), 0),
        filesSentToModel: zipCounts.reduce((n, r) => n + (r.filesSentToModel || 0), 0),
        note: "Strict single-flight: only one ZIP is sent to the model at a time; the next waits until that score finishes.",
      },
      worker: {
        mode: "single-flight",
        description:
          "Extract → score sequentially per isolated test submit. Scores update that test’s candidates.",
      },
    };

    return NextResponse.json({
      summary,
      jobs: scoringJobs,
      submissions: recentSubs.map((s) => ({
        id: String(s._id),
        name: s.name,
        email: s.email,
        status: s.status,
        originalFilename: s.originalFilename,
        filesExtracted: s.filesExtracted,
        filesSentToModel: s.filesSentToModel,
        filesSentPaths: s.filesSentPaths || [],
        score: s.score,
        feedback: s.feedback,
        summary: s.summary,
        criteriaResults: s.criteriaResults || [],
        scoreBreakdown: s.scoreBreakdown,
        issues: s.issues || [],
        scoreMetadata: s.scoreMetadata,
        error: s.error,
        testId: String(s.testId),
        testTitle: testTitleById.get(String(s.testId)) || "Test",
        testCandidateId: String(s.testCandidateId),
        updatedAt: new Date(
          (s as { updatedAt?: Date }).updatedAt || Date.now()
        ).toISOString(),
      })),
      recentFailures: recentSubs
        .filter((s) => s.status === "failed")
        .slice(0, 10)
        .map((s) => ({
          id: String(s._id),
          name: s.name,
          email: s.email,
          error: s.error || "Failed",
          updatedAt: new Date(
            (s as { updatedAt?: Date }).updatedAt || Date.now()
          ).toISOString(),
        })),
      polledAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

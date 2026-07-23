import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Test } from "@/lib/models/Test";
import { TestCandidate } from "@/lib/models/TestCandidate";
import {
  buildCandidateEmailHtml,
  renderTemplate,
  submissionUrlForToken,
  testCandidateToVars,
} from "@/lib/email-template";
import { sendCandidateEmail } from "@/lib/mailer";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { id } = await params;

    let onlyFailed = false;
    let candidateId: string | null = null;
    let sendAll = false;
    try {
      const body = await request.json();
      onlyFailed = Boolean(body?.onlyFailed);
      candidateId = typeof body?.candidateId === "string" ? body.candidateId : null;
      sendAll = Boolean(body?.sendAll);
    } catch {
      onlyFailed = false;
    }

    const test = await Test.findById(id);
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    let filter: Record<string, unknown>;
    if (candidateId) {
      filter = { testId: id, _id: candidateId };
    } else if (sendAll) {
      filter = { testId: id };
    } else if (onlyFailed) {
      filter = { testId: id, emailStatus: "failed" };
    } else {
      filter = { testId: id, emailStatus: { $in: ["pending", "failed"] } };
    }

    const candidates = await TestCandidate.find(filter).sort({ createdAt: 1 });
    if (!candidates.length) {
      return NextResponse.json({ error: "No candidates left to email" }, { status: 400 });
    }

    const origin = request.nextUrl.origin;
    const submissionUrl = submissionUrlForToken(test.submitToken, origin);

    let sent = 0;
    let failed = 0;

    for (const candidate of candidates) {
      try {
        const vars = testCandidateToVars({
          name: candidate.name,
          email: candidate.email,
          submissionUrl,
          testTitle: test.title,
        });
        await sendCandidateEmail({
          to: candidate.email,
          toName: candidate.name,
          subject: renderTemplate(test.subjectTemplate, vars),
          text: renderTemplate(test.bodyTemplate, vars),
          html: buildCandidateEmailHtml(vars),
        });
        candidate.emailStatus = "sent";
        candidate.emailError = undefined;
        candidate.sentAt = new Date();
        await candidate.save();
        sent += 1;
      } catch (error) {
        candidate.emailStatus = "failed";
        candidate.emailError =
          error instanceof Error ? error.message : "Unknown send error";
        await candidate.save();
        failed += 1;
      }
    }

    const emailedCount = await TestCandidate.countDocuments({
      testId: id,
      emailStatus: "sent",
    });
    test.emailedCount = emailedCount;
    await test.save();

    return NextResponse.json({
      test,
      batch: { attempted: candidates.length, sent, failed },
      submissionUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

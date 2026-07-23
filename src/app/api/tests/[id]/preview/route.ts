import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Test, type ITest } from "@/lib/models/Test";
import { TestCandidate, type ITestCandidate } from "@/lib/models/TestCandidate";
import {
  buildCandidateEmailHtml,
  renderTemplate,
  submissionUrlForToken,
  testCandidateToVars,
} from "@/lib/email-template";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { id } = await params;
    const email = request.nextUrl.searchParams.get("email");

    const test = (await Test.findById(id).lean()) as ITest | null;
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const query = email
      ? { testId: id, email: email.toLowerCase() }
      : { testId: id };

    const candidate = (await TestCandidate.findOne(query).lean()) as ITestCandidate | null;
    if (!candidate) {
      return NextResponse.json({ error: "No candidate for preview" }, { status: 404 });
    }

    const submissionUrl = submissionUrlForToken(test.submitToken, request.nextUrl.origin);
    const vars = testCandidateToVars({
      name: candidate.name,
      email: candidate.email,
      submissionUrl,
      testTitle: test.title,
    });

    return NextResponse.json({
      candidate: { name: candidate.name, email: candidate.email },
      subject: renderTemplate(test.subjectTemplate, vars),
      body: renderTemplate(test.bodyTemplate, vars),
      html: buildCandidateEmailHtml(vars),
      submissionUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

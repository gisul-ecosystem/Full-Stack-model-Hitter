import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Test, type ITest } from "@/lib/models/Test";
import { TestCandidate } from "@/lib/models/TestCandidate";
import { submissionUrlForToken } from "@/lib/email-template";
import { parseIstAwareDate } from "@/lib/ist";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function parseCriteria(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((c) => String(c || "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { id } = await params;
    const test = (await Test.findById(id).lean()) as (ITest & { _id: unknown }) | null;
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const candidates = await TestCandidate.find({ testId: id })
      .sort({ createdAt: 1 })
      .lean();

    const origin = request.nextUrl.origin;
    return NextResponse.json({
      test,
      candidates,
      submissionUrl: submissionUrlForToken(test.submitToken, origin),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { id } = await params;
    const body = await request.json();

    const test = await Test.findById(id);
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (typeof body.title === "string" && body.title.trim()) {
      test.title = body.title.trim();
    }
    if (typeof body.description === "string") {
      test.description = body.description.trim();
    }
    if (body.acceptanceCriteria !== undefined) {
      test.acceptanceCriteria = parseCriteria(body.acceptanceCriteria);
    }
    if (typeof body.languageHint === "string") {
      test.languageHint = body.languageHint.trim() || undefined;
    }
    if (typeof body.frameworkHint === "string") {
      test.frameworkHint = body.frameworkHint.trim() || undefined;
    }
    if (typeof body.maxMarks === "number" && body.maxMarks > 0) {
      test.maxMarks = body.maxMarks;
    }
    if (body.evaluationMode === "deep" || body.evaluationMode === "fast") {
      test.evaluationMode = body.evaluationMode;
    }
    if (typeof body.subjectTemplate === "string" && body.subjectTemplate.trim()) {
      test.subjectTemplate = body.subjectTemplate.trim();
    }
    if (typeof body.bodyTemplate === "string" && body.bodyTemplate.trim()) {
      test.bodyTemplate = body.bodyTemplate.trim();
    }
    if (body.status && ["draft", "active", "closed"].includes(body.status)) {
      test.status = body.status;
    }

    if (body.startsAt !== undefined) {
      try {
        const startsAt = parseIstAwareDate(body.startsAt);
        test.startsAt = startsAt || undefined;
      } catch {
        return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
      }
    }
    if (body.endsAt !== undefined) {
      try {
        const endsAt = parseIstAwareDate(body.endsAt);
        test.endsAt = endsAt || undefined;
      } catch {
        return NextResponse.json({ error: "Invalid end time" }, { status: 400 });
      }
    }

    const start = test.startsAt ? new Date(test.startsAt).getTime() : null;
    const end = test.endsAt ? new Date(test.endsAt).getTime() : null;
    if (start != null && end != null && end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    await test.save();
    return NextResponse.json({ test });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { id } = await params;
    const test = await Test.findById(id);
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    await TestCandidate.deleteMany({ testId: id });
    await Test.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { DEFAULT_PROJECT_RUBRIC, Test } from "@/lib/models/Test";
import { DEFAULT_BODY, DEFAULT_SUBJECT } from "@/lib/email-template";
import { createSubmitToken } from "@/lib/tokens";
import { parseIstAwareDate } from "@/lib/ist";

export const runtime = "nodejs";

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

export async function GET() {
  try {
    await connectMongo();
    const tests = await Test.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ tests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list tests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    const body = await request.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const acceptanceCriteria = parseCriteria(body.acceptanceCriteria);
    const languageHint = String(body.languageHint || "").trim();
    const frameworkHint = String(body.frameworkHint || "").trim();

    let startsAt: Date | null | undefined;
    let endsAt: Date | null | undefined;
    try {
      startsAt = parseIstAwareDate(body.startsAt);
      endsAt = parseIstAwareDate(body.endsAt);
    } catch {
      return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
    }

    if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let submitToken = createSubmitToken();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = await Test.findOne({ submitToken });
      if (!clash) break;
      submitToken = createSubmitToken();
    }

    const test = await Test.create({
      title,
      description: description || undefined,
      acceptanceCriteria,
      languageHint: languageHint || undefined,
      frameworkHint: frameworkHint || undefined,
      rubric: { ...DEFAULT_PROJECT_RUBRIC },
      maxMarks: 100,
      evaluationMode: "deep",
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      submitToken,
      subjectTemplate: DEFAULT_SUBJECT,
      bodyTemplate: DEFAULT_BODY,
      status: "draft",
      candidateCount: 0,
      emailedCount: 0,
      scoredCount: 0,
    });

    return NextResponse.json({ test });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Test } from "@/lib/models/Test";
import { DEFAULT_BODY, DEFAULT_SUBJECT } from "@/lib/email-template";
import { createSubmitToken } from "@/lib/tokens";

export const runtime = "nodejs";

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

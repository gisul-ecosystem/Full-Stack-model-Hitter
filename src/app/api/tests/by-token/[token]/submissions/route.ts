import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import { Test } from "@/lib/models/Test";
import { TestCandidate } from "@/lib/models/TestCandidate";
import { Submission } from "@/lib/models/Submission";
import { saveZipFile } from "@/lib/storage";
import { processSubmissionQueue } from "@/lib/submission-queue";
import { normalizeSubmitToken } from "@/lib/tokens";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

const metaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
});

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { token: raw } = await params;
    const token = normalizeSubmitToken(raw);

    const test = await Test.findOne({ submitToken: token });
    if (!test) {
      return NextResponse.json({ error: "Invalid submission link" }, { status: 404 });
    }
    if (test.status === "closed") {
      return NextResponse.json({ error: "This test is closed" }, { status: 403 });
    }

    const formData = await request.formData();
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const file = formData.get("file");

    const parsed = metaSchema.safeParse({ name, email });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Valid name and email are required" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ZIP file is required" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Only .zip files are accepted" }, { status: 400 });
    }

    const maxBytes = Number(process.env.MAX_ZIP_BYTES || 25 * 1024 * 1024);
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `ZIP too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)` },
        { status: 400 }
      );
    }

    const candidate = await TestCandidate.findOne({
      testId: test._id,
      email: parsed.data.email.toLowerCase(),
    });

    if (!candidate) {
      return NextResponse.json(
        {
          error:
            "This name/email is not a candidate for this test. Use the email you were invited with.",
        },
        { status: 403 }
      );
    }

    // Optional soft check: warn if name differs but still allow if email matches
    const saved = await saveZipFile(file);

    const submission = await Submission.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      testId: test._id,
      testCandidateId: candidate._id,
      originalFilename: file.name,
      zipStoragePath: saved.zipPath,
      status: "queued",
      filesExtracted: 0,
      filesSentToModel: 0,
      extractedFiles: [],
      queuedAt: new Date(),
    });

    await TestCandidate.findByIdAndUpdate(candidate._id, {
      scoreStatus: "queued",
      lastSubmissionId: submission._id,
      filesExtracted: 0,
      filesSentToModel: 0,
      score: undefined,
      feedback: undefined,
      name: parsed.data.name,
    });

    void processSubmissionQueue().catch(() => undefined);

    return NextResponse.json({
      submission: {
        id: String(submission._id),
        status: submission.status,
        testTitle: test.title,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

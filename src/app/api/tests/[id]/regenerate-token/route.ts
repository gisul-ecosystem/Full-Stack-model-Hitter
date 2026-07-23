import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Test } from "@/lib/models/Test";
import { createSubmitToken } from "@/lib/tokens";
import { submissionUrlForToken } from "@/lib/email-template";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { id } = await params;
    const test = await Test.findById(id);
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Retry a few times on the rare unique collision
    let token = createSubmitToken();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = await Test.findOne({ submitToken: token, _id: { $ne: test._id } });
      if (!clash) break;
      token = createSubmitToken();
    }

    test.submitToken = token;
    await test.save();

    return NextResponse.json({
      test,
      submissionUrl: submissionUrlForToken(token, request.nextUrl.origin),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Test, type ITest } from "@/lib/models/Test";
import { normalizeSubmitToken } from "@/lib/tokens";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { token: raw } = await params;
    const token = normalizeSubmitToken(raw);
    const test = (await Test.findOne({ submitToken: token }).lean()) as ITest | null;
    if (!test) {
      return NextResponse.json({ error: "Invalid submission link" }, { status: 404 });
    }
    if (test.status === "closed") {
      return NextResponse.json({ error: "This test is closed" }, { status: 403 });
    }

    return NextResponse.json({
      test: {
        title: test.title,
        description: test.description,
        status: test.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Student } from "@/lib/models/Student";
import { parseStudentsFile } from "@/lib/parse-students";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    const q = (request.nextUrl.searchParams.get("q") || "").trim();
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const students = await Student.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    return NextResponse.json({ students });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list students";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Excel or CSV file is required" }, { status: 400 });
    }

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only .xlsx, .xls, or .csv are supported" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { students, errors } = parseStudentsFile(buffer, file.name);

    if (!students.length) {
      return NextResponse.json(
        { error: "No valid student rows found", errors },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;

    for (const row of students) {
      const existing = await Student.findOne({ email: row.email });
      if (existing) {
        existing.name = row.name;
        await existing.save();
        updated += 1;
      } else {
        await Student.create(row);
        created += 1;
      }
    }

    return NextResponse.json({
      imported: students.length,
      created,
      updated,
      warnings: errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Test } from "@/lib/models/Test";
import { Student } from "@/lib/models/Student";
import { TestCandidate } from "@/lib/models/TestCandidate";
import { parseStudentsFile, type ParsedStudentRow } from "@/lib/parse-students";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function addRowsToTest(testId: string, rows: ParsedStudentRow[]) {
  const test = await Test.findById(testId);
  if (!test) {
    return { error: "Test not found" as const, status: 404 as const };
  }

  let added = 0;
  let skipped = 0;
  let studentsCreated = 0;
  let studentsUpdated = 0;

  for (const row of rows) {
    let student = await Student.findOne({ email: row.email });
    if (student) {
      if (student.name !== row.name) {
        student.name = row.name;
        await student.save();
        studentsUpdated += 1;
      }
    } else {
      student = await Student.create(row);
      studentsCreated += 1;
    }

    try {
      await TestCandidate.create({
        testId: test._id,
        studentId: student._id,
        name: row.name,
        email: row.email,
        emailStatus: "pending",
        scoreStatus: "none",
        filesExtracted: 0,
        filesSentToModel: 0,
      });
      added += 1;
    } catch {
      skipped += 1;
    }
  }

  const candidateCount = await TestCandidate.countDocuments({ testId: test._id });
  test.candidateCount = candidateCount;
  if (test.status === "draft" && candidateCount > 0) test.status = "active";
  await test.save();

  const candidates = await TestCandidate.find({ testId: test._id }).sort({ createdAt: 1 }).lean();

  return {
    added,
    skipped,
    studentsCreated,
    studentsUpdated,
    candidateCount,
    candidates,
    test,
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";

    let rows: ParsedStudentRow[] = [];
    let parseErrors: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "CSV or Excel file is required" }, { status: 400 });
      }
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
        return NextResponse.json(
          { error: "Only .xlsx, .xls, or .csv are supported" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = parseStudentsFile(buffer, file.name);
      rows = parsed.students;
      parseErrors = parsed.errors;
      if (!rows.length) {
        return NextResponse.json(
          { error: "No valid rows found. Need columns: name, email.", errors: parseErrors },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      const studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];
      const people: unknown[] = Array.isArray(body.people) ? body.people : [];

      if (people.length) {
        for (const person of people) {
          if (!person || typeof person !== "object") continue;
          const name = String((person as { name?: unknown }).name || "").trim();
          const email = String((person as { email?: unknown }).email || "")
            .trim()
            .toLowerCase();
          if (name && email) rows.push({ name, email });
        }
      } else if (studentIds.length) {
        const students = await Student.find({ _id: { $in: studentIds } });
        rows = students.map((s) => ({ name: s.name, email: s.email }));
      }

      if (!rows.length) {
        return NextResponse.json(
          { error: "Provide name and email, or upload a CSV" },
          { status: 400 }
        );
      }
    }

    const result = await addRowsToTest(id, rows);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ...result,
      warnings: parseErrors.length ? parseErrors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add candidates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await connectMongo();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const candidateId = typeof body?.candidateId === "string" ? body.candidateId : null;
    const removeAll = Boolean(body?.removeAll);

    const test = await Test.findById(id);
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (removeAll) {
      await TestCandidate.deleteMany({ testId: id });
    } else if (candidateId) {
      await TestCandidate.deleteOne({ _id: candidateId, testId: id });
    } else {
      return NextResponse.json({ error: "candidateId or removeAll required" }, { status: 400 });
    }

    const candidateCount = await TestCandidate.countDocuments({ testId: id });
    const emailedCount = await TestCandidate.countDocuments({
      testId: id,
      emailStatus: "sent",
    });
    const scoredCount = await TestCandidate.countDocuments({
      testId: id,
      scoreStatus: "completed",
    });
    test.candidateCount = candidateCount;
    test.emailedCount = emailedCount;
    test.scoredCount = scoredCount;
    await test.save();

    const candidates = await TestCandidate.find({ testId: id }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ test, candidates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove candidates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

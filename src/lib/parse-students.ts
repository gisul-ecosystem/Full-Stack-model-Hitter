import * as XLSX from "xlsx";
import { z } from "zod";

const emailSchema = z.string().email();

export type ParsedStudentRow = {
  name: string;
  email: string;
};

export type ParseStudentsResult = {
  students: ParsedStudentRow[];
  errors: string[];
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function detectKind(filename: string): "excel" | "csv" | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "excel";
  return null;
}

export function parseStudentsFile(buffer: Buffer, filename: string): ParseStudentsResult {
  const kind = detectKind(filename);
  if (!kind) {
    return { students: [], errors: ["Use .xlsx, .xls, or .csv"] };
  }

  let rawRows: Record<string, unknown>[] = [];
  try {
    if (kind === "csv") {
      const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
      const workbook = XLSX.read(text, { type: "string", raw: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    }
  } catch {
    return { students: [], errors: [`Could not read ${kind} file`] };
  }

  if (!rawRows.length) {
    return { students: [], errors: ["File is empty"] };
  }

  const students: ParsedStudentRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  rawRows.forEach((row, index) => {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[normalizeHeader(k)] = v;
    }

    const name = String(
      normalized.name || normalized.full_name || normalized.student_name || ""
    ).trim();
    const email = String(normalized.email || normalized.email_id || "")
      .trim()
      .toLowerCase();
    const excelRow = index + 2;

    if (!name || !email) {
      errors.push(`Row ${excelRow}: name and email are required`);
      return;
    }
    if (!emailSchema.safeParse(email).success) {
      errors.push(`Row ${excelRow}: invalid email "${email}"`);
      return;
    }
    if (seen.has(email)) {
      errors.push(`Row ${excelRow}: duplicate email "${email}"`);
      return;
    }
    seen.add(email);
    students.push({ name, email });
  });

  return { students, errors };
}

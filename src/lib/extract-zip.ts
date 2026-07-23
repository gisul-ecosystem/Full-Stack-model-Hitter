import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import {
  extractDirFor,
  guessLanguage,
  shouldIncludeExtractedFile,
} from "@/lib/storage";

export type ExtractedFileInfo = {
  path: string;
  size: number;
  language?: string;
  content?: string;
};

const MAX_FILES = 80;
const MAX_FILE_BYTES = 200_000;
const MAX_FILE_CHARS = 12_000;
const MAX_TOTAL_CHARS = 2_000_000;
const MAX_TOTAL_PROMPT_CHARS = 40_000;

export async function extractZipSubmission(
  submissionId: string,
  zipStoragePath: string
): Promise<ExtractedFileInfo[]> {
  const outDir = extractDirFor(submissionId);
  await fs.mkdir(outDir, { recursive: true });

  const zip = new AdmZip(zipStoragePath);
  const entries = zip.getEntries();

  // Prevent zip-slip
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const target = path.resolve(outDir, entry.entryName);
    if (!target.startsWith(path.resolve(outDir) + path.sep) && target !== path.resolve(outDir)) {
      throw new Error(`Unsafe zip path rejected: ${entry.entryName}`);
    }
  }

  zip.extractAllTo(outDir, true);

  const collected: ExtractedFileInfo[] = [];

  async function walk(dir: string, base = "") {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const rel = path.join(base, item.name).replace(/\\/g, "/");
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        const parts = rel.split("/");
        if (
          parts.some((p) =>
            ["node_modules", ".git", "dist", "build", ".next", "__pycache__", "vendor", ".venv", "venv"].includes(
              p
            )
          )
        ) {
          continue;
        }
        await walk(full, rel);
        continue;
      }
      if (!shouldIncludeExtractedFile(rel)) continue;
      const stat = await fs.stat(full);
      if (stat.size > MAX_FILE_BYTES) continue;

      let content: string | undefined;
      try {
        content = await fs.readFile(full, "utf8");
      } catch {
        continue;
      }

      collected.push({
        path: rel,
        size: stat.size,
        language: guessLanguage(rel),
        content,
      });

      if (collected.length >= MAX_FILES) return;
    }
  }

  await walk(outDir);
  return collected;
}

export function buildProjectEvalFiles(files: ExtractedFileInfo[]): {
  path: string;
  content: string;
}[] {
  const out: { path: string; content: string }[] = [];
  let total = 0;

  for (const file of files) {
    const rel = String(file.path || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    if (!rel || rel.includes("..")) continue;
    if (!file.content) continue;

    let content = file.content;
    if (content.length > MAX_FILE_CHARS) {
      content = `${content.slice(0, MAX_FILE_CHARS)}\n/* truncated */`;
    }
    if (total + content.length > MAX_TOTAL_CHARS) break;

    out.push({ path: rel, content });
    total += content.length;
    if (out.length >= MAX_FILES) break;
  }

  return out;
}

export function buildModelUserPrompt(options: {
  submissionId: string;
  name: string;
  email: string;
  files: ExtractedFileInfo[];
}) {
  let used = 0;
  const parts: string[] = [
    `JOB_ID: ${options.submissionId}`,
    `CANDIDATE_NAME: ${options.name}`,
    `CANDIDATE_EMAIL: ${options.email}`,
    "",
    "SUBMISSION_FILES:",
    "",
  ];

  let filesSent = 0;
  for (const file of options.files) {
    const chunk = `=== FILE: ${file.path} ===\n${file.content || ""}\n\n`;
    if (used + chunk.length > MAX_TOTAL_PROMPT_CHARS) break;
    parts.push(chunk);
    used += chunk.length;
    filesSent += 1;
  }

  parts.push(
    "Return a JSON object with fields: score (0-100), feedback (string), summary (string)."
  );

  return { prompt: parts.join("\n"), filesSent };
}

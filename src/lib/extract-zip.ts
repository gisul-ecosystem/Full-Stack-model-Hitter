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
/** 8GB GPU deep mode: keep payloads small (prefer ≤15–20 source files). */
const MAX_EVAL_FILES = 20;
const MAX_FILE_BYTES = 200_000;
const MAX_FILE_CHARS = 10_000;
const MAX_TOTAL_CHARS = 180_000;
const MAX_TOTAL_PROMPT_CHARS = 40_000;

const MANIFEST_NAMES = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "composer.json",
  "gemfile",
]);

const ENTRY_BASENAMES = new Set([
  "index.js",
  "index.ts",
  "main.js",
  "main.ts",
  "main.py",
  "app.js",
  "app.ts",
  "app.py",
  "server.js",
  "server.ts",
  "manage.py",
]);

function basenameLower(rel: string) {
  const parts = rel.replace(/\\/g, "/").split("/");
  return (parts[parts.length - 1] || "").toLowerCase();
}

/** Higher = more useful for deep grading on small GPUs. */
function filePriority(rel: string): number {
  const path = rel.replace(/\\/g, "/");
  const base = basenameLower(path);
  let score = 0;

  if (MANIFEST_NAMES.has(base)) score += 100;
  if (ENTRY_BASENAMES.has(base)) score += 80;
  if (/(^|\/)(src|app|lib|routes|controllers|models|api|server)\//i.test(path)) {
    score += 40;
  }
  // Prefer route modules so planted bugs (e.g. routes/notes.py) are not dropped.
  if (/(^|\/)routes\/[^/]+\.(js|jsx|ts|tsx|py)$/i.test(path)) score += 35;
  if (/\.(js|jsx|ts|tsx|py|go|java|rb|php|cs)$/i.test(base)) score += 25;
  if (/\.(json|yml|yaml|toml)$/i.test(base) && !MANIFEST_NAMES.has(base)) score += 10;
  if (/\.(md|txt)$/i.test(base)) score -= 20;
  if (/(^|\/)(test|tests|__tests__|spec|docs|examples)\//i.test(path)) score -= 15;
  if (base === "readme.md" || base.startsWith("readme.")) score -= 30;

  // Prefer shallower paths slightly
  const depth = path.split("/").length;
  score -= Math.min(depth, 6);

  return score;
}

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
  const ranked = files
    .map((file) => {
      const rel = String(file.path || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
      return { file, rel, priority: filePriority(rel) };
    })
    .filter(({ rel, file }) => Boolean(rel && !rel.includes("..") && file.content))
    .sort((a, b) => b.priority - a.priority || a.rel.localeCompare(b.rel));

  const out: { path: string; content: string }[] = [];
  let total = 0;

  for (const { file, rel } of ranked) {
    let content = file.content || "";
    if (content.length > MAX_FILE_CHARS) {
      content = `${content.slice(0, MAX_FILE_CHARS)}\n/* truncated */`;
    }
    if (total + content.length > MAX_TOTAL_CHARS) continue;

    out.push({ path: rel, content });
    total += content.length;
    if (out.length >= MAX_EVAL_FILES) break;
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

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ROOT = path.join(process.cwd(), "uploads");

export function uploadsRoot() {
  return ROOT;
}

export async function ensureUploadsDirs() {
  await fs.mkdir(path.join(ROOT, "zips"), { recursive: true });
  await fs.mkdir(path.join(ROOT, "extracted"), { recursive: true });
}

export async function saveZipFile(file: File) {
  await ensureUploadsDirs();
  const id = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageName = `${id}-${safeName}`;
  const zipPath = path.join(ROOT, "zips", storageName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(zipPath, buffer);
  return { id, zipPath, storageName, size: buffer.length };
}

export function extractDirFor(submissionId: string) {
  return path.join(ROOT, "extracted", submissionId);
}

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  "vendor",
  ".venv",
  "venv",
]);

const SKIP_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".class",
  ".jar",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".lock",
]);

const SKIP_LOCKFILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "npm-shrinkwrap.json",
  "cargo.lock",
  "poetry.lock",
  "composer.lock",
  "gemfile.lock",
]);

export function shouldIncludeExtractedFile(relativePath: string) {
  const parts = relativePath.split(/[/\\]/).filter(Boolean);
  const base = (parts[parts.length - 1] || "").toLowerCase();
  if (SKIP_LOCKFILES.has(base)) return false;
  if (parts.some((p) => SKIP_DIR.has(p))) return false;
  if (parts.some((p) => p === ".git")) return false;
  const ext = path.extname(relativePath).toLowerCase();
  if (SKIP_EXT.has(ext)) return false;
  return true;
}

export function guessLanguage(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".java": "java",
    ".go": "go",
    ".rb": "ruby",
    ".php": "php",
    ".cs": "csharp",
    ".cpp": "cpp",
    ".c": "c",
    ".html": "html",
    ".css": "css",
    ".json": "json",
    ".md": "markdown",
    ".sql": "sql",
  };
  return map[ext] || "text";
}

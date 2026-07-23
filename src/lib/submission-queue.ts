import { connectMongo } from "@/lib/mongodb";
import { Test, type ITest } from "@/lib/models/Test";
import { TestCandidate } from "@/lib/models/TestCandidate";
import { Submission } from "@/lib/models/Submission";
import { buildProjectEvalFiles, extractZipSubmission } from "@/lib/extract-zip";
import { withGradingInstructions } from "@/lib/grading-instructions";
import {
  DEFAULT_PROJECT_RUBRIC,
  PROJECT_EVAL_SCHEMA_VERSION,
  scoreSubmissionWithModel,
} from "@/lib/model-client";

function guessLanguageHint(files: { path: string; language?: string }[]) {
  const counts = new Map<string, number>();
  for (const f of files) {
    const lang = (f.language || "").toLowerCase();
    if (!lang || lang === "text" || lang === "json" || lang === "markdown") continue;
    counts.set(lang, (counts.get(lang) || 0) + 1);
  }
  let best = "";
  let bestN = 0;
  for (const [lang, n] of counts) {
    if (n > bestN) {
      best = lang;
      bestN = n;
    }
  }
  return best || undefined;
}

function guessFrameworkHint(files: { path: string; content?: string }[]) {
  const joined = files
    .filter(
      (f) =>
        /package\.json$/i.test(f.path) ||
        /requirements\.txt$/i.test(f.path) ||
        /app\.py$/i.test(f.path)
    )
    .map((f) => f.content || "")
    .join("\n")
    .toLowerCase();
  if (joined.includes("express")) return "express";
  if (joined.includes("next")) return "nextjs";
  if (joined.includes("react")) return "react";
  if (joined.includes("fastapi")) return "fastapi";
  if (joined.includes("flask")) return "flask";
  if (joined.includes("django")) return "django";
  return undefined;
}

function criteriaFromDescription(description?: string): string[] {
  if (!description?.trim()) return [];
  return description
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length >= 8 && line.length <= 200)
    .slice(0, 8);
}

async function syncTestCandidateFromSubmission(submissionId: string) {
  const submission = await Submission.findById(submissionId);
  if (!submission?.testCandidateId) return;

  const scoreStatus =
    submission.status === "completed"
      ? "completed"
      : submission.status === "failed"
        ? "failed"
        : submission.status;

  await TestCandidate.findByIdAndUpdate(submission.testCandidateId, {
    scoreStatus,
    score: submission.score,
    feedback: submission.feedback,
    lastSubmissionId: submission._id,
    filesExtracted: submission.filesExtracted,
    filesSentToModel: submission.filesSentToModel,
  });

  if (submission.testId && submission.status === "completed") {
    const scoredCount = await TestCandidate.countDocuments({
      testId: submission.testId,
      scoreStatus: "completed",
    });
    await Test.findByIdAndUpdate(submission.testId, { scoredCount });
  }
}

export async function extractOne(submissionId: string) {
  const submission = await Submission.findById(submissionId);
  if (!submission) return null;

  submission.status = "extracting";
  await submission.save();
  await syncTestCandidateFromSubmission(String(submission._id));

  try {
    const files = await extractZipSubmission(
      String(submission._id),
      submission.zipStoragePath
    );
    submission.extractedFiles = files.map((f) => ({
      path: f.path,
      size: f.size,
      language: f.language,
    }));
    submission.filesExtracted = files.length;
    submission.extractDir = `uploads/extracted/${submission._id}`;
    submission.status = "extracted";
    submission.extractedAt = new Date();
    submission.error = undefined;
    await submission.save();
    await syncTestCandidateFromSubmission(String(submission._id));
    return submission;
  } catch (error) {
    submission.status = "failed";
    submission.error = error instanceof Error ? error.message : "Extract failed";
    await submission.save();
    await syncTestCandidateFromSubmission(String(submission._id));
    throw error;
  }
}

export async function scoreOne(
  submissionId: string,
  options?: { useCache?: boolean }
) {
  const submission = await Submission.findById(submissionId);
  if (!submission) return null;

  submission.status = "scoring";
  await submission.save();
  await syncTestCandidateFromSubmission(String(submission._id));

  try {
    const files = await extractZipSubmission(
      String(submission._id),
      submission.zipStoragePath
    );
    const payloadFiles = buildProjectEvalFiles(files);
    if (!payloadFiles.length) {
      throw new Error("No eligible text files found after extract");
    }

    const test = submission.testId
      ? ((await Test.findById(submission.testId).lean()) as ITest | null)
      : null;

    const assignmentTitle = test?.title?.trim() || "Project submission";
    const baseDescription =
      test?.description?.trim() ||
      `Grade the submitted project for “${assignmentTitle}”. Prefer clear structure, working endpoints/features, validation, and sensible error handling.`;
    const assignmentDescription = withGradingInstructions(baseDescription);

    const storedCriteria = (test?.acceptanceCriteria || [])
      .map((c) => c.trim())
      .filter(Boolean);
    const acceptanceCriteria =
      storedCriteria.length > 0
        ? storedCriteria
        : (() => {
            const fromDesc = criteriaFromDescription(test?.description);
            return fromDesc.length
              ? fromDesc
              : [
                  "Implements the core assignment requirements",
                  "Code is organized into sensible modules",
                  "Input validation and error handling are present where expected",
                  "Dependencies and entrypoint are clear (e.g. package.json / main file)",
                ];
          })();

    const languageHint =
      test?.languageHint?.trim() || guessLanguageHint(files) || undefined;
    const frameworkHint =
      test?.frameworkHint?.trim() || guessFrameworkHint(files) || undefined;

    const result = await scoreSubmissionWithModel({
      question_id: test ? `test-${String(submission.testId)}` : String(submission._id),
      assignment_title: assignmentTitle,
      assignment_description: assignmentDescription,
      language_hint: languageHint,
      framework_hint: frameworkHint,
      acceptance_criteria: acceptanceCriteria,
      rubric: test?.rubric
        ? {
            correctness: test.rubric.correctness,
            code_quality: test.rubric.code_quality,
            architecture: test.rubric.architecture,
            best_practices: test.rubric.best_practices,
          }
        : DEFAULT_PROJECT_RUBRIC,
      evaluation_mode: test?.evaluationMode || "deep",
      max_marks: test?.maxMarks || 100,
      use_cache: options?.useCache ?? false,
      schema_version: PROJECT_EVAL_SCHEMA_VERSION,
      files: payloadFiles,
    });

    submission.filesSentToModel = result.filesSent;
    submission.filesSentPaths = result.filesSentPaths || payloadFiles.map((f) => f.path);
    submission.score = result.score;
    submission.feedback = result.feedback;
    submission.summary = result.summary;
    submission.criteriaResults = result.criteriaResults || [];
    submission.scoreBreakdown = result.breakdown;
    submission.issues = result.issues || [];
    submission.scoreMetadata = result.metadata;
    submission.modelRaw = result.raw.slice(0, 20_000);
    submission.status = "completed";
    submission.scoredAt = new Date();
    submission.completedAt = new Date();
    submission.error = undefined;
    await submission.save();
    await syncTestCandidateFromSubmission(String(submission._id));
    return submission;
  } catch (error) {
    submission.status = "failed";
    submission.error = error instanceof Error ? error.message : "Scoring failed";
    await submission.save();
    await syncTestCandidateFromSubmission(String(submission._id));
    throw error;
  }
}

export async function reevaluateSubmission(submissionId: string) {
  await connectMongo();
  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw new Error("Submission not found");
  }
  if (!["failed", "completed"].includes(submission.status)) {
    throw new Error("Only failed or completed submissions can be reevaluated");
  }

  submission.score = undefined;
  submission.feedback = undefined;
  submission.summary = undefined;
  submission.criteriaResults = [];
  submission.scoreBreakdown = undefined;
  submission.issues = [];
  submission.scoreMetadata = undefined;
  submission.modelRaw = undefined;
  submission.error = undefined;
  submission.scoredAt = undefined;
  submission.completedAt = undefined;
  submission.filesSentToModel = 0;
  submission.filesSentPaths = [];
  submission.status = "extracted";
  submission.extractedAt = new Date();
  await submission.save();
  await syncTestCandidateFromSubmission(String(submission._id));

  return scoreOne(String(submission._id), { useCache: false });
}

export async function processSubmissionQueue() {
  await connectMongo();

  const ready = await Submission.findOne({ status: "extracted" }).sort({
    extractedAt: 1,
  });
  if (ready) {
    await scoreOne(String(ready._id));
    const nextQueued = await Submission.findOne({ status: "queued" }).sort({
      queuedAt: 1,
    });
    if (nextQueued) {
      try {
        await extractOne(String(nextQueued._id));
        return {
          action: "score_and_pre_extract",
          scoredId: String(ready._id),
          extractedId: String(nextQueued._id),
        };
      } catch {
        return { action: "score", submissionId: String(ready._id) };
      }
    }
    return { action: "score", submissionId: String(ready._id) };
  }

  const queued = await Submission.findOne({ status: "queued" }).sort({
    queuedAt: 1,
  });
  if (queued) {
    await extractOne(String(queued._id));
    return { action: "extract", submissionId: String(queued._id) };
  }

  return { action: "idle" };
}

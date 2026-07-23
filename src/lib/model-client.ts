export type ProjectEvalFile = {
  path: string;
  content: string;
};

export type ModelScoreIssue = {
  severity?: string;
  category?: string;
  path?: string;
  issue?: string;
  why_it_matters?: string;
  fix?: string;
  rubric_link?: string;
};

export type ModelScoreCriterion = {
  criterion?: string;
  status?: string;
  score?: number;
  detail?: string;
  evidence_paths?: string[];
};

export type ModelScoreBreakdown = Record<
  string,
  { score?: number; weight?: number; comments?: string }
>;

export type ModelScoreMetadata = {
  files_received?: number;
  files_after_filter?: number;
  files_used_in_prompt?: number;
  evaluation_mode?: string;
  grading_status?: string;
  cache_hit?: boolean;
  test_anchored?: boolean;
  truncated?: boolean;
};

export type ModelScoreResult = {
  score: number;
  feedback: string;
  summary?: string;
  raw: string;
  filesSent: number;
  filesSentPaths?: string[];
  jobId?: string;
  breakdown?: ModelScoreBreakdown;
  criteriaResults?: ModelScoreCriterion[];
  issues?: ModelScoreIssue[];
  metadata?: ModelScoreMetadata;
};

export type ProjectEvalTestSummary = {
  total_tests: number;
  total_passed: number;
  public_total?: number;
  public_passed?: number;
  hidden_total?: number;
  hidden_passed?: number;
};

export type ProjectEvalRequest = {
  question_id: string;
  assignment_title?: string;
  assignment_description?: string;
  language_hint?: string;
  framework_hint?: string;
  acceptance_criteria?: string[];
  rubric?: Record<string, number>;
  evaluation_mode?: "deep" | "fast";
  max_marks?: number;
  use_cache?: boolean;
  schema_version?: string;
  test_summary?: ProjectEvalTestSummary;
  files: ProjectEvalFile[];
};

export const DEFAULT_PROJECT_RUBRIC: Record<string, number> = {
  correctness: 0.4,
  code_quality: 0.25,
  architecture: 0.2,
  best_practices: 0.15,
};

export const PROJECT_EVAL_SCHEMA_VERSION = "project_eval.v2";

type FeedbackStrength =
  | string
  | {
      title?: string;
      detail?: string;
      evidence_paths?: string[];
    };

type FeedbackIssue = ModelScoreIssue;

type FeedbackSuggestion =
  | string
  | {
      priority?: number;
      action?: string;
      path?: string;
      detail?: string;
    };

type ProjectEvalResult = {
  overall_score?: number;
  score_in_marks?: number;
  percentage?: number;
  max_marks?: number;
  score_breakdown?: ModelScoreBreakdown;
  criteria_results?: ModelScoreCriterion[];
  feedback?: {
    summary?: string;
    strengths?: FeedbackStrength[];
    weaknesses?: string[];
    strengths_flat?: string[];
    suggestions_flat?: string[];
    issues?: ModelScoreIssue[];
    suggestions?: FeedbackSuggestion[];
    file_notes?: { path?: string; note?: string }[];
  };
  metadata?: ModelScoreMetadata;
};

type JobPollResponse = {
  status?: string;
  job_id?: string;
  error?: string | { message?: string };
  result?: ProjectEvalResult;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatStrength(item: FeedbackStrength): string {
  if (typeof item === "string") return item;
  const title = item.title?.trim();
  const detail = item.detail?.trim();
  if (title && detail) return `${title}: ${detail}`;
  return title || detail || "";
}

function formatSuggestion(item: FeedbackSuggestion): string {
  if (typeof item === "string") return item;
  const action = item.action?.trim();
  const detail = item.detail?.trim();
  const path = item.path?.trim();
  const bits = [action, detail, path ? `(${path})` : ""].filter(Boolean);
  return bits.join(" — ");
}

function formatIssue(item: FeedbackIssue): string {
  const bits = [
    item.severity ? `[${item.severity}]` : "",
    item.path ? `${item.path}:` : "",
    item.issue || "",
    item.fix ? `Fix: ${item.fix}` : "",
  ].filter(Boolean);
  return bits.join(" ").trim();
}

function formatFeedback(result: ProjectEvalResult): string {
  const fb = result.feedback || {};
  const parts: string[] = [];

  if (fb.summary) parts.push(fb.summary);

  const strengths = (fb.strengths || []).map(formatStrength).filter(Boolean);
  if (strengths.length) {
    parts.push(`Strengths:\n- ${strengths.join("\n- ")}`);
  } else if (fb.strengths_flat?.length) {
    parts.push(`Strengths:\n- ${fb.strengths_flat.join("\n- ")}`);
  }

  const issues = (fb.issues || []).map(formatIssue).filter(Boolean);
  if (issues.length) {
    parts.push(`Issues:\n- ${issues.join("\n- ")}`);
  } else if (fb.weaknesses?.length) {
    parts.push(`Weaknesses:\n- ${fb.weaknesses.join("\n- ")}`);
  }

  const suggestions = (fb.suggestions || []).map(formatSuggestion).filter(Boolean);
  if (suggestions.length) {
    parts.push(`Suggestions:\n- ${suggestions.join("\n- ")}`);
  } else if (fb.suggestions_flat?.length) {
    parts.push(`Suggestions:\n- ${fb.suggestions_flat.join("\n- ")}`);
  }

  if (fb.file_notes?.length) {
    const notes = fb.file_notes
      .map((n) => `${n.path || "file"}: ${n.note || ""}`.trim())
      .filter(Boolean);
    if (notes.length) parts.push(`File notes:\n- ${notes.join("\n- ")}`);
  }

  if (result.criteria_results?.length) {
    const lines = result.criteria_results.map((c) => {
      const status = c.status || "?";
      const score = typeof c.score === "number" ? ` (${c.score})` : "";
      const detail = c.detail ? ` — ${c.detail}` : "";
      return `${c.criterion || "criterion"} [${status}]${score}${detail}`;
    });
    parts.push(`Criteria:\n- ${lines.join("\n- ")}`);
  }

  if (result.score_breakdown) {
    const lines = Object.entries(result.score_breakdown).map(([key, val]) => {
      const score = typeof val?.score === "number" ? val.score : "?";
      const comments = val?.comments ? ` — ${val.comments}` : "";
      return `${key}: ${score}${comments}`;
    });
    if (lines.length) parts.push(`Breakdown:\n- ${lines.join("\n- ")}`);
  }

  return parts.join("\n\n") || "No feedback provided";
}

function getModelBaseUrl() {
  return (process.env.MODEL_API_URL || "https://model.aaptor.com").replace(/\/$/, "");
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return { json: JSON.parse(text) as Record<string, unknown>, text };
  } catch {
    return { json: null, text };
  }
}

function errorDetail(json: Record<string, unknown> | null, text: string) {
  if (!json) return text.slice(0, 400);

  const detail = json.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const d = detail as { error?: unknown; message?: unknown; hint?: unknown };
    const bits = [
      typeof d.error === "string" ? d.error : "",
      typeof d.message === "string" ? d.message : "",
      typeof d.hint === "string" ? d.hint : "",
    ].filter(Boolean);
    if (bits.length) return bits.join(" — ");
  }

  const err = json.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message || text.slice(0, 400));
  }
  if (typeof json.message === "string") return json.message;
  return text.slice(0, 400);
}

function parseCompletedResult(
  result: ProjectEvalResult,
  filesSent: number,
  jobId?: string,
  rawSource?: unknown,
  filesSentPaths?: string[]
): ModelScoreResult {
  const rawScore =
    result.overall_score ?? result.score_in_marks ?? result.percentage ?? NaN;
  if (Number.isNaN(Number(rawScore))) {
    throw new Error("Model response missing overall_score");
  }

  const rawObj =
    rawSource && typeof rawSource === "object"
      ? (rawSource as { result?: ProjectEvalResult; metadata?: ModelScoreMetadata })
      : null;
  const metadata = result.metadata || rawObj?.result?.metadata || rawObj?.metadata;

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(rawScore)))),
    feedback: formatFeedback(result),
    summary: result.feedback?.summary,
    raw: JSON.stringify(rawSource ?? result).slice(0, 50_000),
    filesSent,
    filesSentPaths,
    jobId,
    breakdown: result.score_breakdown,
    criteriaResults: result.criteria_results,
    issues: result.feedback?.issues || [],
    metadata,
  };
}

export async function scoreSubmissionWithModel(
  request: ProjectEvalRequest
): Promise<ModelScoreResult> {
  const baseUrl = getModelBaseUrl();
  const filesSent = request.files.length;
  const filesSentPaths = request.files.map((f) => f.path);

  if (!filesSent) {
    throw new Error("No text files to send for scoring");
  }

  if (process.env.MODEL_SCORING_DISABLED === "1") {
    const fake = {
      score: Math.min(95, 55 + filesSent * 2),
      feedback:
        "MODEL_SCORING_DISABLED=1. Placeholder score based on extracted file count.",
      summary: "Placeholder scoring",
    };
    return { ...fake, raw: JSON.stringify(fake), filesSent, filesSentPaths };
  }

  const payload = {
    question_id: request.question_id,
    assignment_title: request.assignment_title,
    assignment_description: request.assignment_description,
    language_hint: request.language_hint,
    framework_hint: request.framework_hint,
    acceptance_criteria: request.acceptance_criteria,
    rubric: request.rubric || DEFAULT_PROJECT_RUBRIC,
    evaluation_mode: request.evaluation_mode || "deep",
    max_marks: request.max_marks ?? 100,
    // Default false for verify/first runs; callers may opt into cache.
    use_cache: request.use_cache ?? false,
    schema_version: request.schema_version || PROJECT_EVAL_SCHEMA_VERSION,
    test_summary: request.test_summary,
    files: request.files,
  };

  // Preferred: async submit + poll (no auth headers)
  const asyncUrl = `${baseUrl}/api/v1/evaluation/project/async`;
  const submitRes = await fetch(asyncUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const submitted = await readJson(submitRes);
  if (!submitRes.ok) {
    const detail = errorDetail(submitted.json, submitted.text);
    if (submitRes.status === 503) {
      throw new Error(`Model eval failed (503). ${detail}`);
    }
    if (submitRes.status === 401) {
      throw new Error(
        `Model async submit failed (401): ${detail}. Gateway should not require auth for this route — restart the model gateway if you still see ORG_HEADER_MISSING.`
      );
    }
    throw new Error(`Model async submit failed (${submitRes.status}): ${detail}`);
  }

  const jobId = String(
    (submitted.json as { job_id?: string } | null)?.job_id || ""
  ).trim();
  if (!jobId) {
    throw new Error("Model async submit did not return job_id");
  }

  const pollIntervalMs = Number(process.env.MODEL_POLL_INTERVAL_MS || 2500);

  // Poll until the model job completes or fails — no wall-clock timeout.
  for (;;) {
    await sleep(pollIntervalMs);

    const pollRes = await fetch(`${baseUrl}/api/v1/job/${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const polled = await readJson(pollRes);
    if (!pollRes.ok) {
      const detail = errorDetail(polled.json, polled.text);
      if (pollRes.status === 401) {
        throw new Error(
          `Model job poll failed (401): ${detail}. No auth headers are sent — restart the model gateway if job poll still requires org/API headers.`
        );
      }
      throw new Error(`Model job poll failed (${pollRes.status}): ${detail}`);
    }

    const job = (polled.json || {}) as JobPollResponse;
    const status = String(job.status || "").toLowerCase();

    if (status === "failed" || status === "error") {
      const err =
        typeof job.error === "string"
          ? job.error
          : job.error?.message || "Model job failed";
      throw new Error(`Model job failed: ${err}`);
    }

    if (status === "complete" || status === "completed" || status === "success") {
      return parseCompletedResult(
        job.result || {},
        filesSent,
        jobId,
        polled.json,
        filesSentPaths
      );
    }

    // pending | processing | queued → keep polling
  }
}

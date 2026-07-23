import mongoose, { Schema, models, model } from "mongoose";

export type SubmissionStatus =
  | "queued"
  | "extracting"
  | "extracted"
  | "scoring"
  | "completed"
  | "failed";

export interface IExtractedFile {
  path: string;
  size: number;
  language?: string;
}

export interface ICriterionResult {
  criterion?: string;
  status?: string;
  score?: number;
  detail?: string;
  evidence_paths?: string[];
}

export interface IScoreIssue {
  severity?: string;
  category?: string;
  path?: string;
  issue?: string;
  why_it_matters?: string;
  fix?: string;
  rubric_link?: string;
}

export interface IScoreBreakdownItem {
  score?: number;
  weight?: number;
  comments?: string;
}

export interface IScoreMetadata {
  files_received?: number;
  files_after_filter?: number;
  files_used_in_prompt?: number;
  evaluation_mode?: string;
  grading_status?: string;
  cache_hit?: boolean;
  test_anchored?: boolean;
  truncated?: boolean;
}

export interface ISubmission {
  name: string;
  email: string;
  testId: mongoose.Types.ObjectId;
  testCandidateId: mongoose.Types.ObjectId;
  originalFilename: string;
  zipStoragePath: string;
  extractDir?: string;
  status: SubmissionStatus;
  filesExtracted: number;
  filesSentToModel: number;
  filesSentPaths: string[];
  extractedFiles: IExtractedFile[];
  score?: number;
  feedback?: string;
  summary?: string;
  criteriaResults: ICriterionResult[];
  scoreBreakdown?: Record<string, IScoreBreakdownItem>;
  issues: IScoreIssue[];
  scoreMetadata?: IScoreMetadata;
  modelRaw?: string;
  error?: string;
  queuedAt: Date;
  extractedAt?: Date;
  scoredAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExtractedFileSchema = new Schema<IExtractedFile>(
  {
    path: { type: String, required: true },
    size: { type: Number, required: true },
    language: { type: String },
  },
  { _id: false }
);

const CriterionResultSchema = new Schema<ICriterionResult>(
  {
    criterion: { type: String },
    status: { type: String },
    score: { type: Number },
    detail: { type: String },
    evidence_paths: { type: [String], default: [] },
  },
  { _id: false }
);

const ScoreIssueSchema = new Schema<IScoreIssue>(
  {
    severity: { type: String },
    category: { type: String },
    path: { type: String },
    issue: { type: String },
    why_it_matters: { type: String },
    fix: { type: String },
    rubric_link: { type: String },
  },
  { _id: false }
);

const SubmissionSchema = new Schema<ISubmission>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    testCandidateId: {
      type: Schema.Types.ObjectId,
      ref: "TestCandidate",
      required: true,
      index: true,
    },
    originalFilename: { type: String, required: true },
    zipStoragePath: { type: String, required: true },
    extractDir: { type: String },
    status: {
      type: String,
      enum: ["queued", "extracting", "extracted", "scoring", "completed", "failed"],
      default: "queued",
      index: true,
    },
    filesExtracted: { type: Number, default: 0 },
    filesSentToModel: { type: Number, default: 0 },
    filesSentPaths: { type: [String], default: [] },
    extractedFiles: { type: [ExtractedFileSchema], default: [] },
    score: { type: Number },
    feedback: { type: String },
    summary: { type: String },
    criteriaResults: { type: [CriterionResultSchema], default: [] },
    scoreBreakdown: { type: Schema.Types.Mixed },
    issues: { type: [ScoreIssueSchema], default: [] },
    scoreMetadata: { type: Schema.Types.Mixed },
    modelRaw: { type: String },
    error: { type: String },
    queuedAt: { type: Date, default: Date.now },
    extractedAt: { type: Date },
    scoredAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const Submission =
  models.Submission || model<ISubmission>("Submission", SubmissionSchema);

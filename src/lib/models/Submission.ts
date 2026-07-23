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
  extractedFiles: IExtractedFile[];
  score?: number;
  feedback?: string;
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
    extractedFiles: { type: [ExtractedFileSchema], default: [] },
    score: { type: Number },
    feedback: { type: String },
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

import mongoose, { Schema, models, model } from "mongoose";

export type EmailStatus = "pending" | "sent" | "failed" | "skipped";
export type ScoreStatus =
  | "none"
  | "queued"
  | "extracting"
  | "extracted"
  | "scoring"
  | "completed"
  | "failed";

export interface ITestCandidate {
  testId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  labsEmail?: string;
  labsPassword?: string;
  emailStatus: EmailStatus;
  emailError?: string;
  sentAt?: Date;
  scoreStatus: ScoreStatus;
  score?: number;
  feedback?: string;
  filesExtracted: number;
  filesSentToModel: number;
  lastSubmissionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TestCandidateSchema = new Schema<ITestCandidate>(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    labsEmail: { type: String, trim: true, lowercase: true },
    labsPassword: { type: String, trim: true },
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
      index: true,
    },
    emailError: { type: String },
    sentAt: { type: Date },
    scoreStatus: {
      type: String,
      enum: ["none", "queued", "extracting", "extracted", "scoring", "completed", "failed"],
      default: "none",
      index: true,
    },
    score: { type: Number },
    feedback: { type: String },
    filesExtracted: { type: Number, default: 0 },
    filesSentToModel: { type: Number, default: 0 },
    lastSubmissionId: { type: Schema.Types.ObjectId, ref: "Submission" },
  },
  { timestamps: true }
);

TestCandidateSchema.index({ testId: 1, email: 1 }, { unique: true });

export const TestCandidate =
  models.TestCandidate || model<ITestCandidate>("TestCandidate", TestCandidateSchema);

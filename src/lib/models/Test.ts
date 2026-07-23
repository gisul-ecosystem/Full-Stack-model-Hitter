import { Schema, models, model } from "mongoose";

export type TestStatus = "draft" | "active" | "closed";

export const DEFAULT_PROJECT_RUBRIC = {
  correctness: 0.4,
  code_quality: 0.25,
  architecture: 0.2,
  best_practices: 0.15,
} as const;

export interface ITest {
  title: string;
  description?: string;
  acceptanceCriteria: string[];
  languageHint?: string;
  frameworkHint?: string;
  rubric: {
    correctness: number;
    code_quality: number;
    architecture: number;
    best_practices: number;
  };
  maxMarks: number;
  evaluationMode: "deep" | "fast";
  submitToken: string;
  subjectTemplate: string;
  bodyTemplate: string;
  status: TestStatus;
  candidateCount: number;
  emailedCount: number;
  scoredCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestSchema = new Schema<ITest>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    acceptanceCriteria: { type: [String], default: [] },
    languageHint: { type: String, trim: true },
    frameworkHint: { type: String, trim: true },
    rubric: {
      type: {
        correctness: { type: Number, default: 0.4 },
        code_quality: { type: Number, default: 0.25 },
        architecture: { type: Number, default: 0.2 },
        best_practices: { type: Number, default: 0.15 },
      },
      default: () => ({ ...DEFAULT_PROJECT_RUBRIC }),
    },
    maxMarks: { type: Number, default: 100 },
    evaluationMode: {
      type: String,
      enum: ["deep", "fast"],
      default: "deep",
    },
    submitToken: { type: String, required: true, unique: true, index: true },
    subjectTemplate: { type: String, required: true },
    bodyTemplate: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft",
      index: true,
    },
    candidateCount: { type: Number, default: 0 },
    emailedCount: { type: Number, default: 0 },
    scoredCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Test = models.Test || model<ITest>("Test", TestSchema);

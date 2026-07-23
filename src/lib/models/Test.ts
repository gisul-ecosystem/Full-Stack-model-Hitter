import { Schema, models, model } from "mongoose";

export type TestStatus = "draft" | "active" | "closed";

export interface ITest {
  title: string;
  description?: string;
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

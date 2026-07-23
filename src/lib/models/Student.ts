import { Schema, models, model } from "mongoose";

export interface IStudent {
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Student = models.Student || model<IStudent>("Student", StudentSchema);

import mongoose, { Schema } from "mongoose";

const expertSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    experience: { type: Number, required: true, min: 0 },
    rating: { type: Number, required: true, min: 0, max: 5 },
    bio: { type: String, required: true, trim: true },
    avatar: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

expertSchema.index({ name: "text" });

export const ExpertModel: any = mongoose.models.Expert || mongoose.model("Expert", expertSchema);

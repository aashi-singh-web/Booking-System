import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
  {
    expertId: { type: Schema.Types.ObjectId, ref: "Expert", required: true, index: true },
    expertName: { type: String, required: true, trim: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    userPhone: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    startTime: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed"],
      default: "confirmed",
      index: true,
    },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

bookingSchema.index({ expertId: 1, date: 1, time: 1 }, { unique: true });

export const BookingModel: any = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

import mongoose, { Schema } from "mongoose";

const slotSchema = new Schema(
  {
    expertId: { type: Schema.Types.ObjectId, ref: "Expert", required: true, index: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    startTime: { type: String, required: true },
    status: { type: String, enum: ["available", "booked"], default: "available", index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
  },
  { timestamps: true },
);

slotSchema.index({ expertId: 1, date: 1, time: 1 }, { unique: true });

export const SlotModel: any = mongoose.models.Slot || mongoose.model("Slot", slotSchema);

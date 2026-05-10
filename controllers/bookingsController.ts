import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { BookingModel } from "../models/Booking";
import { ExpertModel } from "../models/Expert";
import { SlotModel } from "../models/Slot";
import type { Server as SocketIOServer } from "socket.io";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BookingPayload = {
  expertId?: string;
  name?: string;
  email?: string;
  phone?: string;
  date?: string;
  time?: string;
  notes?: string;
};

const validateBookingPayload = (payload: BookingPayload): string | null => {
  if (!payload.expertId || !mongoose.Types.ObjectId.isValid(payload.expertId)) return "Valid expertId is required";
  if (!payload.name?.trim()) return "Name is required";
  if (!payload.email?.trim() || !emailRegex.test(payload.email)) return "Valid email is required";
  if (!payload.phone?.trim()) return "Phone is required";
  if (!payload.date?.trim()) return "Date is required";
  if (!payload.time?.trim()) return "Time slot is required";
  return null;
};

export const createBooking = (io: SocketIOServer) => async (req: Request, res: Response, next: NextFunction) => {
  const payload = req.body as BookingPayload;
  const validationError = validateBookingPayload(payload);
  if (validationError) return res.status(400).json({ error: validationError });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const expert = await ExpertModel.findById(payload.expertId).session(session).lean();
    if (!expert) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Expert not found" });
    }

    const slot = await SlotModel.findOneAndUpdate(
      {
        expertId: payload.expertId,
        date: payload.date,
        time: payload.time,
        status: "available",
      },
      {
        $set: {
          status: "booked",
        },
      },
      { new: true, session },
    );

    if (!slot) {
      await session.abortTransaction();
      return res.status(409).json({ error: "This slot is already booked" });
    }

    const booking = new BookingModel({
      _id: new mongoose.Types.ObjectId(),
      expertId: payload.expertId,
      expertName: expert.name,
      userName: payload.name?.trim(),
      userEmail: payload.email?.trim().toLowerCase(),
      userPhone: payload.phone?.trim(),
      date: payload.date,
      time: payload.time,
      startTime: slot.startTime,
      status: "confirmed",
      notes: payload.notes?.trim() || "",
    });

    slot.bookingId = booking._id;

    await Promise.all([booking.save({ session }), slot.save({ session })]);
    await session.commitTransaction();

    io.to(`expert:${String(payload.expertId)}`).emit("slot:update", {
      id: String(slot._id),
      expertId: String(slot.expertId),
      date: slot.date,
      time: slot.time,
      startTime: slot.startTime,
      status: slot.status,
      bookingId: String(slot.bookingId),
    });

    res.status(201).json({ success: true, bookingId: String(booking._id) });
  } catch (error) {
    await session.abortTransaction();
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const mongoError = error as { code?: number } | undefined;
    if (mongoError?.code === 11000) {
      return res.status(409).json({ error: "This slot is already booked" });
    }
    next(error);
  } finally {
    session.endSession();
  }
};

export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status?: "pending" | "confirmed" | "completed" };
    if (!["pending", "confirmed", "completed"].includes(String(status))) {
      return res.status(400).json({ error: "Status must be pending, confirmed, or completed" });
    }

    const booking = await BookingModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true },
    ).lean();

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json({ success: true, booking: { ...booking, id: String(booking._id) } });
  } catch (error) {
    next(error);
  }
};

export const getBookingsByEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email || !emailRegex.test(email)) return res.status(400).json({ error: "Valid email is required" });

    const bookings = await BookingModel.find({ userEmail: email }).sort({ createdAt: -1 }).lean();
    res.json(
      bookings.map((booking) => ({
        ...booking,
        id: String(booking._id),
        expertId: String(booking.expertId),
      })),
    );
  } catch (error) {
    next(error);
  }
};

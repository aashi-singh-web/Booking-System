import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ExpertModel } from "../models/Expert";
import { SlotModel } from "../models/Slot";

const parsePagination = (pageRaw: unknown, limitRaw: unknown) => {
  const page = Math.max(1, Number(pageRaw) || 1);
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

export const getExperts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, page, limit } = req.query;
    const { page: p, limit: l, skip } = parsePagination(page, limit);
    const query: Record<string, unknown> = {};

    if (category && category !== "All") query.category = String(category);
    if (search) query.name = { $regex: String(search), $options: "i" };

    const [experts, total] = await Promise.all([
      ExpertModel.find(query).sort({ rating: -1, experience: -1 }).skip(skip).limit(l).lean(),
      ExpertModel.countDocuments(query),
    ]);

    res.json({
      experts: experts.map((expert) => ({ ...expert, id: String(expert._id) })),
      total,
      page: p,
      totalPages: Math.ceil(total / l) || 1,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpertById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expertId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(expertId)) {
      return res.status(400).json({ error: "Invalid expert id" });
    }

    const [expert, slots] = await Promise.all([
      ExpertModel.findById(expertId).lean(),
      SlotModel.find({ expertId }).sort({ startTime: 1 }).lean(),
    ]);

    if (!expert) return res.status(404).json({ error: "Expert not found" });

    res.json({
      ...expert,
      id: String(expert._id),
      slots: slots.map((slot) => ({ ...slot, id: String(slot._id), expertId: String(slot.expertId) })),
    });
  } catch (error) {
    next(error);
  }
};

import { ExpertModel } from "../models/Expert";
import { SlotModel } from "../models/Slot";

const experts = [
  {
    name: "Sarah Johnson",
    category: "Technology",
    experience: 10,
    rating: 4.9,
    bio: "Specializes in distributed systems and cloud-native architecture.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  },
  {
    name: "Michael Chen",
    category: "Finance",
    experience: 15,
    rating: 4.8,
    bio: "Former Wall Street analyst, expert in venture capital and scaling.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  },
  {
    name: "Elena Rodriguez",
    category: "Design",
    experience: 8,
    rating: 5.0,
    bio: "Award-winning product designer focused on accessibility and UX.",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
  },
  {
    name: "David Kim",
    category: "Health",
    experience: 12,
    rating: 4.7,
    bio: "Integrative medicine specialist and sports nutrition consultant.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
  },
];

const timeSlots = ["10:00", "14:00", "16:00"];

export const seedDatabaseIfEmpty = async () => {
  const count = await ExpertModel.countDocuments();
  if (count > 0) return;

  const insertedExperts = await ExpertModel.insertMany(experts);
  const slotsToCreate: Array<{
    expertId: string;
    date: string;
    time: string;
    startTime: string;
    status: "available";
  }> = [];

  for (const expert of insertedExperts) {
    for (let dayOffset = 0; dayOffset <= 3; dayOffset += 1) {
      const day = new Date();
      day.setDate(day.getDate() + dayOffset);
      for (const time of timeSlots) {
        const [hours, minutes] = time.split(":").map(Number);
        const slotDate = new Date(day);
        slotDate.setHours(hours, minutes, 0, 0);
        slotsToCreate.push({
          expertId: String(expert._id),
          date: slotDate.toISOString().slice(0, 10),
          time,
          startTime: slotDate.toISOString(),
          status: "available",
        });
      }
    }
  }

  await SlotModel.insertMany(slotsToCreate);
};

import mongoose from "mongoose";

export const connectDatabase = async (mongoUri: string) => {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
};

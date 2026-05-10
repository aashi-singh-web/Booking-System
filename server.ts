import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import { connectDatabase } from "./config/database";
import { seedDatabaseIfEmpty } from "./config/seedData";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import createBookingsRoutes from "./routes/bookingsRoutes";
import expertsRoutes from "./routes/expertsRoutes";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required in environment variables");
}

async function startServer() {
  await connectDatabase(MONGODB_URI);
  await seedDatabaseIfEmpty();

  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("join-expert-room", (expertId: string) => {
      if (expertId) socket.join(`expert:${expertId}`);
    });
  });

  app.use(cors());
  app.use(express.json());

  app.use("/api/experts", expertsRoutes);
  app.use("/api/bookings", createBookingsRoutes(io));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

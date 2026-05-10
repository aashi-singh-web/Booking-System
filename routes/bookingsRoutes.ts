import { Router } from "express";
import type { Server as SocketIOServer } from "socket.io";
import { createBooking, getBookingsByEmail, updateBookingStatus } from "../controllers/bookingsController";

const createBookingsRoutes = (io: SocketIOServer) => {
  const router = Router();

  router.post("/", createBooking(io));
  router.patch("/:id/status", updateBookingStatus);
  router.get("/", getBookingsByEmail);

  return router;
};

export default createBookingsRoutes;

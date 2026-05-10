import { Router } from "express";
import { getExpertById, getExperts } from "../controllers/expertsController";

const router = Router();

router.get("/", getExperts);
router.get("/:id", getExpertById);

export default router;

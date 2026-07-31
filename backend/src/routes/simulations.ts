import { Router } from "express";
import {
  saveSimulation,
  getSimulation,
} from "../controllers/simulationController";
import { optionalAuthMiddleware } from "../utils/authMiddleware";

const router = Router();

// POST /api/simulations/save
router.post("/save", optionalAuthMiddleware as any, saveSimulation as any);

// GET /api/simulations/:shareId
router.get("/:shareId", getSimulation as any);

export default router;

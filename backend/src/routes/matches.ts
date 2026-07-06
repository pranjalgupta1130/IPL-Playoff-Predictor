import { Router } from "express";
import { getMatches, getUpcoming, getCompleted } from "../controllers/matchesController";

const router = Router();

router.get("/", getMatches);
router.get("/upcoming", getUpcoming);
router.get("/completed", getCompleted);

export default router;

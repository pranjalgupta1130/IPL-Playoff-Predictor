import { Router } from "express";
import { getMe, login, register } from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Milestone 2: protected profile endpoint
router.get("/me", requireAuth, getMe);

export default router;




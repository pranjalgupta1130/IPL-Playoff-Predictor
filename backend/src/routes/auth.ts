import { Router } from "express";
import { register, login, getMe, updateStats } from "../controllers/authController";
import { authMiddleware } from "../utils/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware as any, getMe as any);
router.put("/stats", authMiddleware as any, updateStats as any);

export default router;

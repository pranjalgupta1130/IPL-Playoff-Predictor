import { Router } from "express";
import { getUniverse } from "../controllers/universeController";

const router = Router();

router.get("/", getUniverse);

export default router;


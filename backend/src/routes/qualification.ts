import { Router } from "express";
import {
  getAllProbabilities,
  getTeamQualification,
} from "../controllers/qualificationController";

const router = Router();

router.get("/", getAllProbabilities);
router.get("/team/:teamName", getTeamQualification);

export default router;

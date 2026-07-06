import { Router } from "express";
import {
  getPredictions,
  upsertPrediction,
  deletePrediction,
  resetAllPredictions,
} from "../controllers/predictionsController";

const router = Router();

router.get("/", getPredictions);
router.post("/", upsertPrediction);
router.delete("/reset/all", resetAllPredictions);
router.delete("/:matchId", deletePrediction);

export default router;

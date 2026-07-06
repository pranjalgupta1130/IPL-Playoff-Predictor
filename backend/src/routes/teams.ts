import { Router } from "express";
import { getStandings, getTeams } from "../controllers/teamsController";

const router = Router();

router.get("/", getTeams);
router.get("/standings", getStandings);

export default router;

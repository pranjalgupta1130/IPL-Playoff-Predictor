import { Request, Response } from "express";
import mongoose from "mongoose";
import { Prediction } from "../models/Prediction";
import { Match, MarginType } from "../models/Match";
import { Team } from "../models/Team";
import { buildFullStandings } from "../services/standingsService";
import { loadUniverseState } from "../services/universeService";

async function loadStandingsPayload() {
  const universe = await loadUniverseState(true);
  return universe.simulation.fullStandings;
}

export async function getPredictions(_req: Request, res: Response): Promise<void> {
  try {
    const predictions = await Prediction.find().populate("matchId");
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch predictions" });
  }
}

export async function upsertPrediction(req: Request, res: Response): Promise<void> {
  try {
    const {
      matchId,
      predictedWinner,
      margin,
      marginType,
      chaseRuns,
      fixtureId,
      _id,
    } = req.body as {
      matchId?: string;
      predictedWinner: string;
      margin: number;
      marginType: MarginType;
      chaseRuns?: number;
      // Back-compat: allow common variants of identifiers.
      fixtureId?: string;
      _id?: string;
    };


    const resolvedMatchId = matchId ?? fixtureId ?? _id;

    if (!resolvedMatchId || !predictedWinner || margin == null || !marginType) {
      res.status(400).json({
        message: "matchId (or fixtureId/_id), predictedWinner, margin, and marginType are required",
      });
      return;
    }


    const validTypes = [
      "defended_runs",
      "chase_overs",
      "balls_remaining",
      "runs",
      "wickets",
    ];
    if (!validTypes.includes(marginType)) {
      res.status(400).json({ message: "Invalid marginType" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(resolvedMatchId)) {
      res.status(400).json({ message: "Invalid matchId" });
      return;
    }

    const match = await Match.findById(resolvedMatchId);

    if (!match) {
      res.status(404).json({ message: "Match not found" });
      return;
    }

    // Eligibility MUST be based on the derived Match-50 universe (51-70 league fixtures only).
    // Mongo's persisted `completed` state is real IPL results and may be incompatible with the simulator architecture.
    const universe = await loadUniverseState();
    const derivedUpcoming = universe.baseline.upcomingMatches as unknown as { _id: string; matchNumber?: number; stage?: string }[];

    const derivedIds = new Set(derivedUpcoming.map((m) => String(m._id)));
    if (!derivedIds.has(String(match._id))) {
      res.status(400).json({ message: "Cannot predict this match" });
      return;
    }

    const stage = (match as any).stage;
    const matchNumber = (match as any).matchNumber;
    if (stage !== "league" || typeof matchNumber !== "number" || matchNumber < 51 || matchNumber > 70) {
      res.status(400).json({ message: "Cannot predict this match" });
      return;
    }


    if (predictedWinner !== match.teamA && predictedWinner !== match.teamB) {
      res.status(400).json({ message: "Winner must be one of the two teams in the match" });
      return;
    }

    const update: Record<string, unknown> = {
      matchId: resolvedMatchId,
      predictedWinner,
      margin: Number(margin),
      marginType,
    };

    if (chaseRuns != null) update.chaseRuns = Number(chaseRuns);

    const prediction = await Prediction.findOneAndUpdate(
      { matchId: resolvedMatchId },
      update,
      { upsert: true, new: true }
    );


    const standings = await loadStandingsPayload();
    res.json({ prediction, standings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to save prediction" });
  }
}

export async function deletePrediction(req: Request, res: Response): Promise<void> {
  try {
    const { matchId } = req.params;
    await Prediction.findOneAndDelete({ matchId });
    const standings = await loadStandingsPayload();
    res.json({ standings });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete prediction" });
  }
}

export async function resetAllPredictions(_req: Request, res: Response): Promise<void> {
  try {
    await Prediction.deleteMany({});
    const standings = await loadStandingsPayload();
    res.json({ standings, predictions: [] });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset predictions" });
  }
}

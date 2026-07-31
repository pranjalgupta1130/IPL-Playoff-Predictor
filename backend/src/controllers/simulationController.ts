import { Response } from "express";
import { AuthRequest } from "../utils/authMiddleware";
import {
  saveSimulationSnapshot,
  getSimulationByShareId,
  getSimulationsByOwner,
  deleteSimulationByShareIdAndOwner,
} from "../services/simulationService";

/**
 * Dynamically resolves base origin from request or configuration.
 */
function resolveClientOrigin(req: AuthRequest): string {
  const origin =
    process.env.CLIENT_URL ||
    process.env.CORS_ORIGIN ||
    `${req.protocol}://${req.get("host")}`;
  return origin.replace(/\/$/, "");
}

/**
 * POST /api/simulations/save
 * Receives current simulation snapshot, validates payload, stores in MongoDB
 * without recomputing standings or Monte Carlo probabilities, and returns { shareId, shareUrl, simulation }.
 */
export async function saveSimulation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.body || typeof req.body !== "object" || Object.keys(req.body).length === 0) {
      res.status(400).json({ message: "Malformed request: request body cannot be empty" });
      return;
    }

    const predictions = req.body.predictions;
    const completedMatchesSnapshot =
      req.body.completedMatchesSnapshot ?? req.body.completedMatches;
    const generatedStandings =
      req.body.generatedStandings ?? req.body.standings;
    const qualificationResults =
      req.body.qualificationResults ?? req.body.qualification ?? req.body.requirements;
    const playoffProbabilities =
      req.body.playoffProbabilities ?? req.body.probabilities ?? req.body.monteCarlo;

    const rawTitle = req.body.title || req.body.metadata?.title;
    const defaultTitle = `IPL 2026 Playoff Scenario - ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

    const title = typeof rawTitle === "string" && rawTitle.trim().length > 0
      ? rawTitle.trim()
      : defaultTitle;

    const metadata = {
      ...(req.body.metadata || {}),
      title,
      version: 1,
    };

    // Validate missing fields
    const missingFields: string[] = [];
    if (!predictions) missingFields.push("predictions");
    if (!completedMatchesSnapshot) missingFields.push("completedMatchesSnapshot");
    if (!generatedStandings) missingFields.push("generatedStandings");
    if (!playoffProbabilities) missingFields.push("playoffProbabilities");

    if (missingFields.length > 0) {
      res.status(400).json({
        message: `Missing required simulation snapshot fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const savedSimulation = await saveSimulationSnapshot(
      {
        predictions,
        completedMatchesSnapshot,
        generatedStandings,
        qualificationResults,
        playoffProbabilities,
        metadata,
      },
      req.userId
    );

    const shareUrl = `${resolveClientOrigin(req)}/share/${savedSimulation.shareId}`;

    res.status(201).json({
      shareId: savedSimulation.shareId,
      shareUrl,
      title,
      createdAt: savedSimulation.createdAt,
    });
  } catch (error: any) {
    console.error("Failed to save simulation:", error);
    res.status(500).json({
      message: "Failed to save simulation",
      error: error?.message ?? String(error),
    });
  }
}

/**
 * GET /api/simulations/:shareId
 * Retrieves stored simulation snapshot directly from MongoDB.
 * Does NOT rerun Monte Carlo or recompute standings.
 */
export async function getSimulation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { shareId } = req.params;

    if (!shareId || typeof shareId !== "string" || shareId.trim().length === 0) {
      res.status(400).json({ message: "Invalid share ID parameter" });
      return;
    }

    const validShareIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validShareIdRegex.test(shareId.trim())) {
      res.status(400).json({ message: "Invalid share ID format" });
      return;
    }

    // =========================================================================
    // TODO: Redis Caching Integration Point
    // -------------------------------------------------------------------------
    // Immutable snapshots are optimal cache targets (100% cache hits, zero invalidation).
    // =========================================================================

    const simulation = await getSimulationByShareId(shareId);

    if (!simulation) {
      res.status(404).json({ message: "Simulation not found" });
      return;
    }

    const shareUrl = `${resolveClientOrigin(req)}/share/${simulation.shareId}`;

    res.status(200).json({
      ...simulation,
      shareUrl,
    });
  } catch (error: any) {
    console.error("Failed to retrieve simulation:", error);
    res.status(500).json({
      message: "Failed to retrieve simulation",
      error: error?.message ?? String(error),
    });
  }
}

/**
 * GET /api/simulations/my-simulations
 * Returns all saved simulations owned by the authenticated user sorted newest first.
 */
export async function getUserSimulations(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const simulations = await getSimulationsByOwner(req.userId);
    const clientOrigin = resolveClientOrigin(req);

    const formatted = simulations.map((sim) => ({
      shareId: sim.shareId,
      shareUrl: `${clientOrigin}/share/${sim.shareId}`,
      title: sim.metadata?.title || `IPL Playoff Scenario (${sim.shareId})`,
      createdAt: sim.createdAt,
      predictionCount: Array.isArray(sim.predictions) ? sim.predictions.length : 0,
    }));

    res.status(200).json(formatted);
  } catch (error: any) {
    console.error("Failed to fetch user simulations:", error);
    res.status(500).json({ message: "Failed to fetch user simulations" });
  }
}

/**
 * DELETE /api/simulations/:shareId
 * Deletes a saved simulation owned by the authenticated user after ownership verification.
 */
export async function deleteSimulation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const { shareId } = req.params;
    if (!shareId) {
      res.status(400).json({ message: "Share ID is required" });
      return;
    }

    const deleted = await deleteSimulationByShareIdAndOwner(shareId, req.userId);

    if (!deleted) {
      res.status(404).json({
        message: "Simulation not found or you do not have permission to delete it",
      });
      return;
    }

    res.status(200).json({ message: "Simulation deleted successfully", shareId });
  } catch (error: any) {
    console.error("Failed to delete simulation:", error);
    res.status(500).json({ message: "Failed to delete simulation" });
  }
}

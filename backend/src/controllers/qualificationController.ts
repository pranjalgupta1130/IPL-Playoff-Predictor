import { Request, Response } from "express";
import { loadUniverseState } from "../services/universeService";
import { calculateQualificationRequirements } from "../services/qualificationEngine";
import { runMonteCarloSimulation } from "../services/simulation/monteCarloEngine";

function runMonteCarloFromUniverse(universe: Awaited<ReturnType<typeof loadUniverseState>>) {
  return runMonteCarloSimulation(
    universe.baseline.teams,
    universe.baseline.upcomingMatches,
    universe.simulation.predictions,
    universe.simulation.fullStandings,
    1000
  );
}

export async function getAllProbabilities(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const includeUserPredictions = req.query.includeUserPredictions === "true";
    const universe = await loadUniverseState(includeUserPredictions);
    const monteCarlo = runMonteCarloFromUniverse(universe);
    res.json({
      probabilities: monteCarlo.odds,
      monteCarlo,
      standings: universe.simulation.fullStandings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to calculate qualification probabilities" });
  }
}

export async function getTeamQualification(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const rawTeamName = req.params.teamName;
    const teamName = Array.isArray(rawTeamName)
      ? decodeURIComponent(rawTeamName[0] ?? "")
      : decodeURIComponent(rawTeamName);
    const includeUserPredictions = req.query.includeUserPredictions === "true";
    const universe = await loadUniverseState(includeUserPredictions);

    const requirements = calculateQualificationRequirements(
      teamName,
      universe.baseline.teams,
      universe.baseline.upcomingMatches,
      universe.simulation.fullStandings
    );

    if (!requirements) {
      res.status(404).json({ message: "Team not found" });
      return;
    }

    const monteCarlo = runMonteCarloFromUniverse(universe);
    const probability = monteCarlo.odds.find((p) => p.teamName === teamName);

    res.json({
      requirements,
      probability,
      monteCarlo,
      standings: universe.simulation.fullStandings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to analyze team qualification" });
  }
}

import { Request, Response } from "express";
import { loadUniverseState } from "../services/universeService";
import { calculateQualificationRequirements } from "../services/qualificationEngine";
import { runMonteCarloSimulation } from "../services/simulation/monteCarloEngine";

function runMonteCarloFromUniverse(
  universe: Awaited<ReturnType<typeof loadUniverseState>>,
  opts: { includeUserPredictions: boolean }
) {
  return runMonteCarloSimulation(
    universe.baseline.teams,
    universe.baseline.upcomingMatches,
    opts.includeUserPredictions ? universe.simulation.predictions : [],
    universe.simulation.fullStandings,
    1000
  );
}


export async function getAllProbabilities(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const universe = await loadUniverseState();
    const monteCarlo = runMonteCarloFromUniverse(universe, { includeUserPredictions: false });
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
    const universe = await loadUniverseState();

    // OFFICIAL universe: qualification requirements must NOT be affected by user predictions.
    // The derived `fullStandings` may include projected/movement data based on predictions,
    // so we recompute requirements from an “official odds” Monte Carlo run that uses no predictions.
    const officialMonteCarlo = runMonteCarloFromUniverse(universe, { includeUserPredictions: false });

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

    const probability = officialMonteCarlo.odds.find((p) => p.teamName === teamName);


    res.json({
      requirements,
      probability,
      monteCarlo: officialMonteCarlo,
      standings: universe.simulation.fullStandings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to analyze team qualification" });
  }
}

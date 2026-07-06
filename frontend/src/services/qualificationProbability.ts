import type {
  FullStandingsResult,
  Match,
  MonteCarloResult,
  QualificationProbability,
  Prediction,
  TeamBaseline,
} from "@/types";
import {
  runMonteCarloSimulation,
  runMonteCarloSimulationAsync,
} from "@/services/simulation/monteCarloEngine";
import { buildMonteCarloCacheKey } from "@/services/simulation/simulationCache";

const DEFAULT_ITERATIONS = 1000;

let cachedKey: string | null = null;
let cachedResult: MonteCarloResult | null = null;

export function clearMonteCarloCache(): void {
  cachedKey = null;
  cachedResult = null;
}

function getOrRunMonteCarlo(
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  predictions: Prediction[],
  fullStandings: FullStandingsResult,
  iterations = DEFAULT_ITERATIONS
): MonteCarloResult {
  const key = buildMonteCarloCacheKey(
    teams,
    upcomingMatches,
    predictions,
    iterations
  );

  if (cachedKey === key && cachedResult) {
    return cachedResult;
  }

  const result = runMonteCarloSimulation({
    teams,
    upcomingMatches,
    predictions,
    fullStandings,
    iterations,
  });

  cachedKey = key;
  cachedResult = result;
  return result;
}

/**
 * All teams' playoff / top-2 / elimination % via Monte Carlo.
 * Replaces the previous deterministic heuristic.
 */
export function calculateAllQualificationProbabilities(
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  fullStandings: FullStandingsResult,
  predictions: Prediction[] = [],
  iterations = DEFAULT_ITERATIONS
): QualificationProbability[] {
  return getOrRunMonteCarlo(
    teams,
    upcomingMatches,
    predictions,
    fullStandings,
    iterations
  ).odds;
}

export function calculateQualificationProbability(
  team: TeamBaseline,
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  fullStandings: FullStandingsResult,
  predictions: Prediction[] = []
): QualificationProbability {
  const result = getOrRunMonteCarlo(
    teams,
    upcomingMatches,
    predictions,
    fullStandings
  );
  return (
    result.odds.find((o) => o.teamName === team.name) ?? {
      teamName: team.name,
      shortName: team.shortName,
      percentage: 0,
      playoffPercentage: 0,
      topTwoPercentage: 0,
      eliminationPercentage: 100,
      volatility: "high",
      confidenceRange: { low: 0, high: 0 },
      confidence: "low",
      projectedQualified: false,
      rank: 10,
    }
  );
}

/** Async Monte Carlo with progress callback (UI-friendly) */
export async function calculateAllQualificationProbabilitiesAsync(
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  predictions: Prediction[],
  fullStandings: FullStandingsResult,
  onProgress?: (progress: number) => void,
  iterations = DEFAULT_ITERATIONS
): Promise<MonteCarloResult> {
  const key = buildMonteCarloCacheKey(
    teams,
    upcomingMatches,
    predictions,
    iterations
  );

  if (cachedKey === key && cachedResult) {
    onProgress?.(1);
    return cachedResult;
  }

  const result = await runMonteCarloSimulationAsync(
    {
      teams,
      upcomingMatches,
      predictions,
      fullStandings,
      iterations,
    },
    onProgress
  );

  cachedKey = key;
  cachedResult = result;
  return result;
}

export { calculatePlayoffOdds, calculateTop2Odds } from "@/services/simulation/monteCarloEngine";

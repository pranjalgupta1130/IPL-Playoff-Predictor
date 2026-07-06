import { IMatch } from "../models/Match";
import { ITeam } from "../models/Team";
import { IPrediction } from "../models/Prediction";
import { FullStandingsResult } from "./standingsService";
import { runMonteCarloSimulation, MonteCarloTeamOdds } from "./simulation/monteCarloEngine";

export type ConfidenceLevel = "high" | "medium" | "low";

/** @deprecated Use MonteCarloTeamOdds */
export type QualificationProbability = MonteCarloTeamOdds;

export function calculateAllQualificationProbabilities(
  teams: ITeam[],
  upcomingMatches: IMatch[],
  fullStandings: FullStandingsResult,
  predictions: IPrediction[] = [],
  iterations = 1000
): MonteCarloTeamOdds[] {
  return runMonteCarloSimulation(
    teams,
    upcomingMatches,
    predictions,
    fullStandings,
    iterations
  ).odds;
}

import type { FullStandingsResult, Match, Prediction, TeamBaseline } from "@/types";

/** Official season data — never mutated by user simulations */
export interface OfficialBaseline {
  teams: TeamBaseline[];
  completedMatches: Match[];
  upcomingMatches: Match[];
}

/** User scenario layer applied on top of baseline */
export interface SimulationLayer {
  predictions: Prediction[];
  fullStandings: FullStandingsResult;
}

export interface UniverseState {
  baseline: OfficialBaseline;
  simulation: SimulationLayer;
}

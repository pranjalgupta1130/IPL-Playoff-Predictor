/**
 * Alternate-universe ready data layers.
 * Baseline = official season snapshot (never mutated by simulations).
 * Simulation = user predictions layered on top.
 */

import { ITeam } from "../models/Team";
import { IMatch } from "../models/Match";
import { IPrediction } from "../models/Prediction";
import { FullStandingsResult } from "../services/standingsService";

export interface OfficialBaseline {
  teams: ITeam[];
  completedMatches: IMatch[];
  upcomingMatches: IMatch[];
}

export interface SimulationLayer {
  predictions: IPrediction[];
  fullStandings: FullStandingsResult;
}

export interface UniverseState {
  baseline: OfficialBaseline;
  simulation: SimulationLayer;
}

export type { ResultType, MarginType, MatchResultInput } from "./cricket";
export type {
  QualificationRequirements,
  QualificationProbability,
  QualificationStatus,
  NrrPressure,
  ConfidenceLevel,
  VolatilityLevel,
  MonteCarloResult,
  MonteCarloTeamOdds,
} from "./qualification";
export type { UniverseState, OfficialBaseline, SimulationLayer } from "./universe";

export type TableViewMode = "real" | "projected";

export interface TeamBaseline {
  name: string;
  shortName: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  nrr: number;
}

export interface StandingsRow extends TeamBaseline {
  qualified?: boolean;
  rank?: number;
}

export interface StandingsRowWithMovement extends StandingsRow {
  rankChange: number;
  pointsDelta: number;
  nrrDelta: number;
  enteredPlayoffs: boolean;
  droppedFromPlayoffs: boolean;
}

export interface StandingsBundle {
  standings: StandingsRow[];
  topFour: StandingsRow[];
  outsideQualification: StandingsRow[];
}

export interface FullStandingsResult {
  real: StandingsBundle;
  projected: StandingsBundle;
  projectedWithMovement: StandingsRowWithMovement[];
  hasPredictions: boolean;
}

/** @deprecated Use FullStandingsResult */
export type StandingsResult = FullStandingsResult;

import type { MarginType } from "./cricket";

export interface Match {
  _id: string;
  teamA: string;
  teamB: string;
  date: string;
  venue: string;
  completed: boolean;
  winner?: string;
  margin?: number;
  marginType?: MarginType;
  chaseRuns?: number;
}

export interface Prediction {
  _id: string;
  matchId: string | Match;
  predictedWinner: string;
  margin: number;
  marginType: MarginType;
  chaseRuns?: number;
}

export interface PredictionPayload {
  matchId: string;
  predictedWinner: string;
  margin: number;
  marginType: MarginType;
  chaseRuns?: number;
}
